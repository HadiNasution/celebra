import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Pool } from "pg";
import { CreateCheckoutDto, PLAN_PRICES } from "./dto/create-checkout.dto";

type XenditInvoice = {
  id: string;
  external_id: string;
  invoice_url: string;
  status: string;
};

type Payment = {
  id: string;
  tenant_id: string | null;
  xendit_invoice_id: string;
  xendit_external_id: string;
  user_email: string;
  user_name: string;
  user_phone: string | null;
  plan: string;
  amount: number;
  status: string;
  paid_at: Date | null;
  expired_at: Date | null;
  created_at: Date;
};

// ponytail: raw pg pool bypasses drizzle prepared statement SCRAM auth bug
const rawPool = new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://celebra:celebra@localhost:5432/celebra",
});

@Injectable()
export class PaymentService {
  private xenditKey = process.env.XENDIT_API_KEY ?? "";

  async createCheckout(dto: CreateCheckoutDto) {
    const amount = PLAN_PRICES[dto.plan];
    const externalId = `celebra-${randomUUID().slice(0, 8)}`;
    const xenditInvoice = await this.createXenditInvoice(dto, externalId, amount);

    const paymentId = randomUUID();
    await rawPool.query(
      `INSERT INTO payments (id, xendit_invoice_id, xendit_external_id, user_email, user_name, user_phone, plan, amount, status, expired_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        paymentId,
        xenditInvoice.id,
        externalId,
        dto.email,
        dto.name,
        dto.phone ?? null,
        dto.plan,
        amount,
        "pending",
        new Date(Date.now() + 24 * 60 * 60 * 1000),
      ],
    );

    return { paymentId, invoiceUrl: xenditInvoice.invoice_url };
  }

  async handlePaidCallback(paymentId: string) {
    const { rows } = await rawPool.query(
      `SELECT * FROM payments WHERE id = $1 LIMIT 1`,
      [paymentId],
    );
    const payment = rows[0] as Payment | undefined;

    if (!payment) throw new Error("Payment not found");
    if (payment.status === "paid") return payment; // idempotent

    const { rows: updated } = await rawPool.query(
      `UPDATE payments SET status = 'paid', paid_at = $1 WHERE id = $2 RETURNING *`,
      [new Date(), paymentId],
    );

    return updated[0] as Payment;
  }

  private async createXenditInvoice(
    dto: CreateCheckoutDto,
    externalId: string,
    amount: number,
  ): Promise<XenditInvoice> {
    if (!this.xenditKey || this.xenditKey === "mock") {
      return {
        id: `mock-${externalId}`,
        external_id: externalId,
        invoice_url: `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/checkout/success?mock=1`,
        status: "PENDING",
      };
    }

    const auth = Buffer.from(`${this.xenditKey}:`).toString("base64");
    const res = await fetch("https://api.xendit.co/v2/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        external_id: externalId,
        amount,
        payer_email: dto.email,
        description: `Celebra — ${dto.plan.replace("_", " ")} plan`,
        success_redirect_url: `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/checkout/success`,
        failure_redirect_url: `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/checkout`,
      }),
    });

    if (!res.ok) throw new Error(`Xendit API error: ${await res.text()}`);
    return res.json() as Promise<XenditInvoice>;
  }
}

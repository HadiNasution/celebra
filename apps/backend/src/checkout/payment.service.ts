import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { db } from "../db/connection";
import { payments } from "../db/schema";
import { CreateCheckoutDto, PLAN_PRICES } from "./dto/create-checkout.dto";
import { eq } from "drizzle-orm";

type XenditInvoice = {
  id: string;
  external_id: string;
  invoice_url: string;
  status: string;
};

@Injectable()
export class PaymentService {
  private xenditKey = process.env.XENDIT_API_KEY ?? "";

  async createCheckout(dto: CreateCheckoutDto) {
    const amount = PLAN_PRICES[dto.plan];
    const externalId = `celebra-${randomUUID().slice(0, 8)}`;
    const xenditInvoice = await this.createXenditInvoice(dto, externalId, amount);

    const [payment] = await db
      .insert(payments)
      .values({
        xenditInvoiceId: xenditInvoice.id,
        xenditExternalId: externalId,
        userEmail: dto.email,
        userName: dto.name,
        userPhone: dto.phone ?? null,
        plan: dto.plan,
        amount,
        status: "pending",
        expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })
      .returning();

    return { paymentId: payment!.id, invoiceUrl: xenditInvoice.invoice_url };
  }

  private async createXenditInvoice(
    dto: CreateCheckoutDto,
    externalId: string,
    amount: number,
  ): Promise<XenditInvoice> {
    // ponytail: if XENDIT_API_KEY not set, return mock for local dev
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

  async handlePaidCallback(xenditInvoiceId: string) {
    const payment = await db
      .select()
      .from(payments)
      .where(eq(payments.xenditInvoiceId, xenditInvoiceId))
      .limit(1);

    if (payment.length === 0) throw new Error("Payment not found");
    if (payment[0]!.status === "paid") return payment[0]!; // idempotent

    const [updated] = await db
      .update(payments)
      .set({ status: "paid", paidAt: new Date() })
      .where(eq(payments.xenditInvoiceId, xenditInvoiceId))
      .returning();

    return updated!;
  }
}

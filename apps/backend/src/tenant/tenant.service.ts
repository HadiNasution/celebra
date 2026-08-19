import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import * as bcrypt from "bcryptjs";
import { rawPool } from "../db/connection";
import { PLAN_MONTHS, type Plan } from "../checkout/dto/create-checkout.dto";

type Payment = {
  id: string;
  tenant_id: string | null;
  user_email: string;
  user_name: string;
  user_phone: string | null;
  plan: string;
};

@Injectable()
export class TenantService {
  async createTenantOnPayment(payment: Payment) {
    if (payment.tenant_id) {
      const { rows } = await rawPool.query(`SELECT slug FROM tenants WHERE id = $1`, [
        payment.tenant_id,
      ]);
      return { alreadyProvisioned: true, slug: rows[0]?.slug ?? null, password: null };
    }

    const slug = this.slugify(payment.user_name);
    const password = randomUUID().slice(0, 12);
    const passwordHash = await bcrypt.hash(password, 10);
    const tenantId = randomUUID();
    const userId = randomUUID();
    const subId = randomUUID();
    const auditId = randomUUID();
    const now = new Date();
    const months = PLAN_MONTHS[payment.plan as Plan] ?? 1;
    const expiredAt = new Date(now);
    expiredAt.setMonth(expiredAt.getMonth() + months);

    const client = await rawPool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3)`,
        [tenantId, slug, payment.user_name],
      );

      await client.query(
        `INSERT INTO users (id, tenant_id, name, email, phone, password_hash, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, tenantId, payment.user_name, payment.user_email.toLowerCase(), payment.user_phone ?? null, passwordHash, "owner"],
      );

      await client.query(
        `INSERT INTO subscriptions (id, tenant_id, plan, status, expired_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [subId, tenantId, payment.plan, "active", expiredAt],
      );

      await client.query(
        `INSERT INTO audit_logs (id, tenant_id, action, entity, entity_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [auditId, tenantId, "tenant.created", "tenant", tenantId, JSON.stringify({ plan: payment.plan })],
      );

      await client.query(
        `UPDATE payments SET tenant_id = $1 WHERE id = $2`,
        [tenantId, payment.id],
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    return { alreadyProvisioned: false, tenant: { id: tenantId, name: payment.user_name, slug }, password, slug };
  }

  async findBySlug(slug: string) {
    const { rows } = await rawPool.query(
      `SELECT * FROM tenants WHERE slug = $1 LIMIT 1`,
      [slug],
    );
    return rows[0] ?? null;
  }

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40)
      + "-" + randomUUID().slice(0, 4);
  }
}

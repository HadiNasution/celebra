import { Injectable } from "@nestjs/common";
import { db } from "../db/connection";
import { tenants, users, subscriptions as subsTable, auditLogs, authUser, authAccount, payments } from "../db/schema";
import { randomUUID } from "crypto";
import * as bcrypt from "bcryptjs";
import { PLAN_MONTHS, type Plan } from "../checkout/dto/create-checkout.dto";
import { eq } from "drizzle-orm";

type Payment = {
  id: string;
  userEmail: string;
  userName: string;
  userPhone: string | null;
  plan: string;
};

@Injectable()
export class TenantService {
  async createTenantOnPayment(payment: Payment) {
    const slug = this.slugify(payment.userName);
    const password = randomUUID().slice(0, 12);
    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date();

    return await db.transaction(async (tx) => {
      const [tenant] = await tx
        .insert(tenants)
        .values({ name: payment.userName, slug })
        .returning();
      if (!tenant) throw new Error("Failed to create tenant");

      await tx.insert(users).values({
        tenantId: tenant.id,
        name: payment.userName,
        email: payment.userEmail,
        phone: payment.userPhone ?? null,
        passwordHash,
        role: "owner",
      });

      // ponytail: insert directly into Better Auth tables for auto-created user
      const authUserId = randomUUID();
      await tx.insert(authUser).values({
        id: authUserId,
        name: payment.userName,
        email: payment.userEmail,
        emailVerified: false,
      });
      await tx.insert(authAccount).values({
        id: randomUUID(),
        userId: authUserId,
        providerId: "credential",
        accountId: authUserId,
        password: passwordHash,
      });

      const months = PLAN_MONTHS[payment.plan as Plan] ?? 1;
      const expiredAt = new Date(now);
      expiredAt.setMonth(expiredAt.getMonth() + months);

      await tx.insert(subsTable).values({
        tenantId: tenant.id,
        plan: payment.plan,
        status: "active",
        expiredAt,
      });

      await tx.insert(auditLogs).values({
        tenantId: tenant.id,
        action: "tenant.created",
        entity: "tenant",
        entityId: tenant.id,
        metadata: { plan: payment.plan },
      });

      await tx
        .update(payments)
        .set({ tenantId: tenant.id })
        .where(eq(payments.id, payment.id));

      return { tenant, password, slug };
    });
  }

  async findBySlug(slug: string) {
    const result = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);
    return result[0] ?? null;
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

import { Injectable } from "@nestjs/common";
import { db } from "../db/connection";
import { subscriptions, auditLogs, tenants } from "../db/schema";
import { eq } from "drizzle-orm";

@Injectable()
export class AdminSubscriptionsService {
  async findAll(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    return db
      .select()
      .from(subscriptions)
      .innerJoin(tenants, eq(subscriptions.tenantId, tenants.id))
      .limit(limit)
      .offset(offset)
      .orderBy(subscriptions.createdAt);
  }

  async activate(id: string) {
    const [sub] = await db
      .update(subscriptions)
      .set({ status: "active" })
      .where(eq(subscriptions.id, id))
      .returning();

    if (sub) {
      await db.insert(auditLogs).values({
        tenantId: sub.tenantId,
        action: "subscription.activated",
        entity: "subscription",
        entityId: sub.id,
      });
    }
    return sub ?? null;
  }

  async cancel(id: string) {
    const [sub] = await db
      .update(subscriptions)
      .set({ status: "cancelled" })
      .where(eq(subscriptions.id, id))
      .returning();

    if (sub) {
      await db.insert(auditLogs).values({
        tenantId: sub.tenantId,
        action: "subscription.cancelled",
        entity: "subscription",
        entityId: sub.id,
      });
    }
    return sub ?? null;
  }
}

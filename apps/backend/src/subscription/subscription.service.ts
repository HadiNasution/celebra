import { Injectable } from "@nestjs/common";
import { db } from "../db/connection";
import { subscriptions } from "../db/schema";
import { eq } from "drizzle-orm";

@Injectable()
export class SubscriptionService {
  async findByTenantId(tenantId: string) {
    const result = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.tenantId, tenantId))
      .limit(1);
    return result[0] ?? null;
  }

  async isActive(tenantId: string): Promise<boolean> {
    const sub = await this.findByTenantId(tenantId);
    if (!sub) return false;
    if (sub.status !== "active") return false;
    if (sub.expiredAt && new Date(sub.expiredAt) < new Date()) return false;
    return true;
  }
}

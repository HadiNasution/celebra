import { Injectable } from "@nestjs/common";
import { db } from "../db/connection";
import { tenants, invitations, subscriptions, payments } from "../db/schema";
import { eq, sql, count } from "drizzle-orm";

@Injectable()
export class AdminDashboardService {
  async getMetrics() {
    const [tenantCount] = await db.select({ count: count() }).from(tenants);
    const [inviteCount] = await db.select({ count: count() }).from(invitations);
    const [revenueResult] = await db
      .select({ total: sql<number>`COALESCE(SUM(${payments.amount}), 0)` })
      .from(payments)
      .where(eq(payments.status, "paid"));

    const recentPayments = await db
      .select()
      .from(payments)
      .where(eq(payments.status, "paid"))
      .orderBy(payments.paidAt ? sql`${payments.paidAt} DESC` : sql`${payments.createdAt} DESC`)
      .limit(10);

    return {
      tenantCount: tenantCount?.count ?? 0,
      invitationCount: inviteCount?.count ?? 0,
      totalRevenue: revenueResult?.total ?? 0,
      recentPayments,
    };
  }
}

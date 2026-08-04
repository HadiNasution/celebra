import { Injectable } from "@nestjs/common";
import { db } from "../db/connection";
import { tenants, users, subscriptions } from "../db/schema";
import { eq } from "drizzle-orm";

@Injectable()
export class AdminCustomersService {
  async findAll(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const rows = await db.select().from(tenants).limit(limit).offset(offset).orderBy(tenants.createdAt);
    return rows;
  }

  async findOne(id: string) {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    if (!tenant) return null;

    const tenantUsers = await db.select().from(users).where(eq(users.tenantId, id));
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.tenantId, id)).limit(1);

    return { ...tenant, users: tenantUsers, subscription: sub ?? null };
  }
}

import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { db } from "../db/connection";
import { auditLogs, tenants, users, subscriptions } from "../db/schema";
import { and, eq, ne } from "drizzle-orm";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class AdminCustomersService {
  async findAll(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const rows = await db.select().from(tenants).limit(limit).offset(offset).orderBy(tenants.createdAt);
    return rows;
  }

  async findOne(id: string) {
    if (!UUID_RE.test(id)) throw new NotFoundException("Customer not found");
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    if (!tenant) throw new NotFoundException("Customer not found");

    const tenantUsers = await db.select().from(users).where(eq(users.tenantId, id));
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.tenantId, id)).limit(1);

    return { ...tenant, users: tenantUsers, subscription: sub ?? null };
  }

  async update(id: string, data: { name?: string; slug?: string }) {
    if (!UUID_RE.test(id)) throw new NotFoundException("Customer not found");
    if (data.slug) {
      const [existing] = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(and(eq(tenants.slug, data.slug), ne(tenants.id, id)))
        .limit(1);
      if (existing) throw new ConflictException("Slug is already in use");
    }

    const [tenant] = await db.update(tenants).set(data).where(eq(tenants.id, id)).returning();
    if (!tenant) throw new NotFoundException("Tenant not found");

    await db.insert(auditLogs).values({
      tenantId: tenant.id,
      action: "tenant.updated",
      entity: "tenant",
      entityId: tenant.id,
      metadata: data,
    });

    return tenant;
  }
}

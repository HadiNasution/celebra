import { Injectable } from "@nestjs/common";
import { db } from "../db/connection";
import { publishHistories, invitations, tenants } from "../db/schema";
import { eq } from "drizzle-orm";

@Injectable()
export class AdminPublishMonitorService {
  async findAll(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    return db
      .select()
      .from(publishHistories)
      .innerJoin(invitations, eq(publishHistories.invitationId, invitations.id))
      .innerJoin(tenants, eq(invitations.tenantId, tenants.id))
      .limit(limit)
      .offset(offset)
      .orderBy(publishHistories.publishedAt);
  }
}

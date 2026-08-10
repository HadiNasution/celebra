import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db, rawPool } from "../db/connection";
import { auditLogs, guestRoles, guests, invitations, rsvps } from "../db/schema";
import { parseCsv } from "./csv";

type GuestUser = { id: string; tenantId: string | null };

@Injectable()
export class GuestService {
  async listRoles() {
    return db.select().from(guestRoles).orderBy(asc(guestRoles.name));
  }

  async list(user: GuestUser, invitationId: string, search?: string) {
    await this.ownedInvitation(user, invitationId);
    const conditions = [eq(guests.invitationId, invitationId)];
    if (search) conditions.push(sql`lower(${guests.name}) LIKE ${`%${search.toLowerCase()}%`}`);
    return db
      .select({
        id: guests.id,
        name: guests.name,
        phone: guests.phone,
        token: guests.token,
        attendanceStatus: guests.attendanceStatus,
        guestRoleId: guests.guestRoleId,
        roleName: guestRoles.name,
        rsvpAttendance: rsvps.attendance,
        rsvpGuestCount: rsvps.guestCount,
        createdAt: guests.createdAt,
      })
      .from(guests)
      .leftJoin(guestRoles, eq(guestRoles.id, guests.guestRoleId))
      .leftJoin(rsvps, eq(rsvps.guestId, guests.id))
      .where(and(...conditions))
      .orderBy(asc(guests.createdAt));
  }

  async create(
    user: GuestUser,
    invitationId: string,
    data: { name: string; phone?: string; guestRoleId?: string },
  ) {
    await this.ownedInvitation(user, invitationId);
    await this.assertRoleExists(data.guestRoleId);
    const token = randomUUID();
    const [guest] = await db
      .insert(guests)
      .values({ invitationId, token, name: data.name.trim(), phone: data.phone?.trim() || null, guestRoleId: data.guestRoleId })
      .returning();
    await this.audit(user, "guest.created", invitationId, guest!.id);
    return guest!;
  }

  async update(
    user: GuestUser,
    invitationId: string,
    guestId: string,
    data: { name?: string; phone?: string; guestRoleId?: string },
  ) {
    const guest = await this.ownedGuest(user, invitationId, guestId);
    await this.assertRoleExists(data.guestRoleId);
    const [updated] = await db
      .update(guests)
      .set({
        name: data.name?.trim() || guest.name,
        phone: data.phone !== undefined ? data.phone.trim() || null : guest.phone,
        guestRoleId: data.guestRoleId !== undefined ? data.guestRoleId : guest.guestRoleId,
        updatedAt: new Date(),
      })
      .where(eq(guests.id, guestId))
      .returning();
    await this.audit(user, "guest.updated", invitationId, guestId);
    return updated!;
  }

  async remove(user: GuestUser, invitationId: string, guestId: string) {
    await this.ownedGuest(user, invitationId, guestId);
    await db.delete(guests).where(eq(guests.id, guestId));
    await this.audit(user, "guest.deleted", invitationId, guestId);
    return { ok: true };
  }

  async importCsv(user: GuestUser, invitationId: string, csv: string) {
    await this.ownedInvitation(user, invitationId);
    const roles = await db.select({ id: guestRoles.id, name: guestRoles.name }).from(guestRoles);
    const roleByName = new Map(roles.map((r) => [r.name.toLowerCase(), r.id]));

    const rows = parseCsv(csv);
    if (rows.length < 2) throw new BadRequestException("CSV must have a header row and at least one data row");

    const headers = rows[0]!.map((h) => h.trim().toLowerCase());
    const colName = headers.indexOf("name");
    const colPhone = headers.indexOf("phone");
    const colRole = headers.indexOf("role");
    if (colName === -1) throw new BadRequestException('CSV must include a "name" column');

    const dataRows = rows.slice(1);
    const toCreate: { name: string; phone: string | null; guestRoleId: string | null }[] = [];
    const skipped: string[] = [];
    const errors: { row: number; reason: string }[] = [];

    const existing = await db
      .select({ name: guests.name })
      .from(guests)
      .where(eq(guests.invitationId, invitationId));
    const existingNames = new Set(existing.map((g) => g.name.toLowerCase()));

    dataRows.forEach((cols, idx) => {
      const rowNum = idx + 2;
      const name = cols[colName]?.trim() ?? "";
      if (!name) {
        errors.push({ row: rowNum, reason: "name is required" });
        return;
      }
      if (existingNames.has(name.toLowerCase())) {
        skipped.push(`row ${rowNum}: duplicate name "${name}"`);
        return;
      }
      const phone = (colPhone !== -1 ? cols[colPhone] : "")?.trim() || null;
      const roleName = (colRole !== -1 ? cols[colRole] : "")?.trim();
      let guestRoleId: string | null = null;
      if (roleName) {
        guestRoleId = roleByName.get(roleName.toLowerCase()) ?? null;
        if (!guestRoleId) {
          errors.push({ row: rowNum, reason: `unknown role "${roleName}"` });
          return;
        }
      }
      existingNames.add(name.toLowerCase());
      toCreate.push({ name, phone, guestRoleId });
    });

    if (toCreate.length > 0) {
      const client = await rawPool.connect();
      try {
        await client.query("BEGIN");
        for (const g of toCreate) {
          await client.query(
            `INSERT INTO guests (id, invitation_id, guest_role_id, token, name, phone)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [randomUUID(), invitationId, g.guestRoleId, randomUUID(), g.name, g.phone],
          );
        }
        await client.query(
          `INSERT INTO audit_logs (id, tenant_id, user_id, action, entity, entity_id, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [randomUUID(), user.tenantId, user.id, "guest.imported", "guest", invitationId, JSON.stringify({ imported: toCreate.length })],
        );
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    }

    return { imported: toCreate.length, skipped: skipped.length, errors, skippedReasons: skipped };
  }

  private async assertRoleExists(roleId?: string) {
    if (!roleId) return;
    const [role] = await db.select({ id: guestRoles.id }).from(guestRoles).where(eq(guestRoles.id, roleId)).limit(1);
    if (!role) throw new BadRequestException("Guest role not found");
  }

  private async ownedInvitation(user: GuestUser, invitationId: string) {
    const [invitation] = await db
      .select({ id: invitations.id })
      .from(invitations)
      .where(and(eq(invitations.id, invitationId), eq(invitations.tenantId, user.tenantId!)))
      .limit(1);
    if (!invitation) throw new NotFoundException("Invitation not found");
  }

  private async ownedGuest(user: GuestUser, invitationId: string, guestId: string) {
    const [guest] = await db
      .select()
      .from(guests)
      .where(and(eq(guests.id, guestId), eq(guests.invitationId, invitationId)))
      .limit(1);
    if (!guest) throw new NotFoundException("Guest not found");
    await this.ownedInvitation(user, invitationId);
    return guest;
  }

  private async audit(user: GuestUser, action: string, invitationId: string, guestId: string) {
    await db.insert(auditLogs).values({
      tenantId: user.tenantId!,
      userId: user.id,
      action,
      entity: "guest",
      entityId: guestId,
      metadata: { invitationId },
    });
  }
}

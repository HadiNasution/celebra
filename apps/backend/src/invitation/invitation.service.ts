import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db, rawPool } from "../db/connection";
import { RedisService } from "../redis/redis.service";
import { auditLogs, invitationContents, invitations, publishHistories, templates, guests, guestbooks, rsvps, subscriptions } from "../db/schema";
import { assembleHtml, renderTemplate } from "./renderer";

export type InvitationUser = {
  id: string;
  tenantId: string | null;
};

type Template = {
  id: string;
  jsonSchema: unknown;
  htmlBundle: string;
  cssBundle: string | null;
  jsBundle: string | null;
};

@Injectable()
export class InvitationService {
  constructor(private readonly redis: RedisService) {}

  async list(user: InvitationUser, status?: string, includeArchived = false) {
    const conditions = [eq(invitations.tenantId, user.tenantId!)];
    if (!includeArchived) conditions.push(isNull(invitations.deletedAt));
    if (status) conditions.push(eq(invitations.status, status));
    return db
      .select({
        id: invitations.id,
        slug: invitations.slug,
        title: invitations.title,
        status: invitations.status,
        publishedAt: invitations.publishedAt,
        deletedAt: invitations.deletedAt,
        createdAt: invitations.createdAt,
        updatedAt: invitations.updatedAt,
        templatePreviewImage: templates.previewImage,
      })
      .from(invitations)
      .leftJoin(templates, eq(templates.id, invitations.templateVersionId))
      .where(and(...conditions))
      .orderBy(desc(invitations.createdAt));
  }

  async findById(user: InvitationUser, id: string) {
    const result = await db
      .select({
        invitation: invitations,
        contentJson: invitationContents.contentJson,
        templateName: templates.name,
        templatePreviewImage: templates.previewImage,
      })
      .from(invitations)
      .leftJoin(invitationContents, eq(invitationContents.invitationId, invitations.id))
      .leftJoin(templates, eq(templates.id, invitations.templateVersionId))
      .where(and(eq(invitations.id, id), eq(invitations.tenantId, user.tenantId!)))
      .limit(1);
    if (!result[0]) throw new NotFoundException("Invitation not found");
    return result[0];
  }

  async getEditorData(user: InvitationUser, id: string) {
    const inv = await this.ownedInvitation(user, id);
    if (!inv) throw new NotFoundException("Invitation not found");
    const [template] = await db
      .select()
      .from(templates)
      .where(eq(templates.id, inv.templateVersionId))
      .limit(1);
    const [content] = await db
      .select({ contentJson: invitationContents.contentJson })
      .from(invitationContents)
      .where(eq(invitationContents.invitationId, id))
      .limit(1);
    return {
      invitation: inv,
      contentJson: (content?.contentJson ?? {}) as Record<string, unknown>,
      schema: (template?.jsonSchema ?? {}) as Record<string, unknown>,
      htmlBundle: template?.htmlBundle ?? "",
      cssBundle: template?.cssBundle ?? "",
      jsBundle: template?.jsBundle ?? "",
    };
  }

  async updateContent(user: InvitationUser, id: string, contentJson: Record<string, unknown>) {
    const inv = await this.ownedInvitation(user, id);
    if (!inv) throw new NotFoundException("Invitation not found");
    if (inv.status === "published") {
      throw new BadRequestException(
        "Published invitations cannot be edited. Duplicate it to create a new version.",
      );
    }

    const template = await this.loadTemplate(inv.templateVersionId);
    if (template) this.validateContent(template.jsonSchema, contentJson);

    await db
      .update(invitationContents)
      .set({ contentJson, updatedAt: new Date() })
      .where(eq(invitationContents.invitationId, id));
    await db.update(invitations).set({ updatedAt: new Date() }).where(eq(invitations.id, id));
    return { ok: true };
  }

  async publish(user: InvitationUser, id: string) {
    const inv = await this.ownedInvitation(user, id);
    if (!inv) throw new NotFoundException("Invitation not found");
    if (inv.status === "published") throw new ConflictException("Invitation is already published");

    const template = await this.loadTemplate(inv.templateVersionId);
    const [content] = await db
      .select({ contentJson: invitationContents.contentJson })
      .from(invitationContents)
      .where(eq(invitationContents.invitationId, id))
      .limit(1);
    const contentJson = (content?.contentJson ?? {}) as Record<string, unknown>;
    if (template) this.validateContent(template.jsonSchema, contentJson);

    const publishedHtml = assembleHtml(
      renderTemplate(template?.htmlBundle ?? "", contentJson),
      template?.cssBundle ?? null,
      template?.jsBundle ?? null,
    );

    const [history] = await db
      .select({ value: count() })
      .from(publishHistories)
      .where(eq(publishHistories.invitationId, id));
    const version = (history?.value ?? 0) + 1;

    const client = await rawPool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE invitations SET status = 'published', published_at = now() WHERE id = $1`,
        [id],
      );
      await client.query(
        `INSERT INTO publish_histories (id, invitation_id, version, status) VALUES ($1, $2, $3, 'success')`,
        [randomUUID(), id, version],
      );
      await client.query(
        `INSERT INTO audit_logs (id, tenant_id, user_id, action, entity, entity_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [randomUUID(), user.tenantId, user.id, "invitation.published", "invitation", id, JSON.stringify({ version })],
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    // ponytail: R2 asset upload + Vercel ISR revalidation deferred until infra is available
    if (this.redis.client.status === "ready") {
      await this.redis.client.set(
        `tenant:${user.tenantId}:invitation:${id}:published_html`,
        publishedHtml,
      );
    }

    return { publishedUrl: `/${inv.slug}`, version };
  }

  async create(user: InvitationUser, data: { templateId: string; title: string; slug?: string }) {
    const [template] = await db
      .select()
      .from(templates)
      .where(eq(templates.id, data.templateId))
      .limit(1);
    if (!template) throw new NotFoundException("Template not found");

    const slug = await this.uniqueSlug(this.slugify(data.slug ?? data.title));
    const invitationId = randomUUID();
    const contentJson = this.defaultsFromSchema(template.jsonSchema);

    const client = await rawPool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO invitations (id, tenant_id, template_version_id, slug, title, status)
         VALUES ($1, $2, $3, $4, $5, 'draft')`,
        [invitationId, user.tenantId, template.id, slug, data.title],
      );
      await client.query(
        `INSERT INTO invitation_contents (id, invitation_id, content_json) VALUES ($1, $2, $3)`,
        [randomUUID(), invitationId, JSON.stringify(contentJson)],
      );
      await client.query(
        `INSERT INTO audit_logs (id, tenant_id, user_id, action, entity, entity_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [randomUUID(), user.tenantId, user.id, "invitation.created", "invitation", invitationId],
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    return this.findById(user, invitationId);
  }

  async duplicate(user: InvitationUser, id: string) {
    const source = await this.ownedInvitation(user, id);
    if (!source) throw new NotFoundException("Invitation not found");

    const [content] = await db
      .select({ contentJson: invitationContents.contentJson })
      .from(invitationContents)
      .where(eq(invitationContents.invitationId, id))
      .limit(1);

    const slug = await this.uniqueSlug(`${source.slug}-copy`);
    const newId = randomUUID();

    const client = await rawPool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO invitations (id, tenant_id, template_version_id, slug, title, status)
         VALUES ($1, $2, $3, $4, $5, 'draft')`,
        [newId, user.tenantId, source.templateVersionId, slug, source.title],
      );
      await client.query(
        `INSERT INTO invitation_contents (id, invitation_id, content_json) VALUES ($1, $2, $3)`,
        [randomUUID(), newId, JSON.stringify(content?.contentJson ?? {})],
      );
      await client.query(
        `INSERT INTO audit_logs (id, tenant_id, user_id, action, entity, entity_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [randomUUID(), user.tenantId, user.id, "invitation.duplicated", "invitation", newId],
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    return this.findById(user, newId);
  }

  async archive(user: InvitationUser, id: string) {
    return this.setArchived(user, id, new Date());
  }

  async restore(user: InvitationUser, id: string) {
    return this.setArchived(user, id, null);
  }

  async getStats(user: InvitationUser, id: string) {
    const inv = await this.ownedInvitation(user, id);
    if (!inv) throw new NotFoundException("Invitation not found");

    const [guestCount] = await db
      .select({ value: count() })
      .from(guests)
      .where(eq(guests.invitationId, id));

    const [guestbookCount] = await db
      .select({ value: count() })
      .from(guestbooks)
      .where(eq(guestbooks.invitationId, id));

    const [rsvpCount] = await db
      .select({ value: count() })
      .from(rsvps)
      .innerJoin(guests, eq(rsvps.guestId, guests.id))
      .where(eq(guests.invitationId, id));

    const [sub] = await db
      .select({ status: subscriptions.status, expiredAt: subscriptions.expiredAt })
      .from(subscriptions)
      .where(eq(subscriptions.tenantId, user.tenantId!))
      .limit(1);

    return {
      visitCount: inv.visitCount ?? 0,
      guestCount: guestCount?.value ?? 0,
      guestbookCount: guestbookCount?.value ?? 0,
      rsvpCount: rsvpCount?.value ?? 0,
      status: inv.status,
      publishedAt: inv.publishedAt,
      subscriptionStatus: sub?.status ?? null,
      subscriptionExpiredAt: sub?.expiredAt ?? null,
    };
  }

  async incrementVisits(id: string) {
    await db
      .update(invitations)
      .set({ visitCount: sql<number>`${invitations.visitCount} + 1` })
      .where(eq(invitations.id, id));
  }

  private async setArchived(user: InvitationUser, id: string, deletedAt: Date | null) {
    const [invitation] = await db
      .update(invitations)
      .set({ deletedAt })
      .where(and(eq(invitations.id, id), eq(invitations.tenantId, user.tenantId!)))
      .returning();
    if (!invitation) throw new NotFoundException("Invitation not found");

    await db.insert(auditLogs).values({
      tenantId: user.tenantId!,
      userId: user.id,
      action: deletedAt ? "invitation.archived" : "invitation.restored",
      entity: "invitation",
      entityId: id,
    });
    return invitation;
  }

  private async loadTemplate(templateVersionId: string): Promise<Template | null> {
    const [template] = await db
      .select()
      .from(templates)
      .where(eq(templates.id, templateVersionId))
      .limit(1);
    return template ?? null;
  }

  private async ownedInvitation(user: InvitationUser, id: string) {
    const result = await db
      .select()
      .from(invitations)
      .where(and(eq(invitations.id, id), eq(invitations.tenantId, user.tenantId!)))
      .limit(1);
    return result[0] ?? null;
  }

  private validateContent(
    schema: unknown,
    content: Record<string, unknown>,
  ) {
    if (!schema || typeof schema !== "object" || Array.isArray(schema)) return;
    for (const [sectionKey, sectionVal] of Object.entries(schema as Record<string, unknown>)) {
      if (!sectionVal || typeof sectionVal !== "object" || Array.isArray(sectionVal)) continue;
      const sectionContent = (content[sectionKey] ?? {}) as Record<string, unknown>;
      for (const [fieldKey, fieldVal] of Object.entries(sectionVal as Record<string, unknown>)) {
        if (!fieldVal || typeof fieldVal !== "object" || !("type" in fieldVal)) continue;
        const meta = fieldVal as Record<string, unknown>;
        const value = sectionContent[fieldKey];
        if (meta.required === true && this.isEmpty(value)) {
          throw new BadRequestException(`${sectionKey}.${fieldKey} is required`);
        }
        if (meta.type === "gallery" && value !== undefined && !Array.isArray(value)) {
          throw new BadRequestException(`${sectionKey}.${fieldKey} must be an array`);
        }
      }
    }
  }

  private isEmpty(value: unknown): boolean {
    return (
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0)
    );
  }

  private async uniqueSlug(base: string): Promise<string> {
    let slug = base;
    let n = 2;
    // ponytail: global slug since public URL = invitation slug; DB constraint is still (tenant_id, slug)
    while (true) {
      const existing = await db
        .select({ id: invitations.id })
        .from(invitations)
        .where(eq(invitations.slug, slug))
        .limit(1);
      if (existing.length === 0) return slug;
      slug = `${base}-${n++}`;
    }
  }

  private slugify(value: string): string {
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
    return slug || "invitation";
  }

  private defaultsFromSchema(schema: unknown): Record<string, unknown> {
    const content: Record<string, unknown> = {};
    if (!schema || typeof schema !== "object" || Array.isArray(schema)) return content;
    for (const [key, value] of Object.entries(schema as Record<string, unknown>)) {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const field = value as Record<string, unknown>;
        if ("type" in field || "default" in field) {
          content[key] = "default" in field ? field.default : this.emptyForType(field.type);
        } else {
          content[key] = this.defaultsFromSchema(field);
        }
      } else if (value !== undefined) {
        content[key] = value;
      }
    }
    return content;
  }

  private emptyForType(type: unknown): unknown {
    if (type === "gallery" || type === "array") return [];
    if (type === "map") return { lat: 0, lng: 0 };
    return "";
  }
}

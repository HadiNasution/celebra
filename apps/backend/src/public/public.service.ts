import {
  BadRequestException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from "@nestjs/common";
import { promises as fs } from "fs";
import { join } from "path";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/connection";
import {
  guestMedia,
  guestbooks,
  guests,
  invitationContents,
  invitations,
  rsvps,
  subscriptions,
  templates,
} from "../db/schema";
import { RedisService } from "../redis/redis.service";
import { assertRateLimit } from "../common/rate-limit";
import { assembleHtml, renderTemplate } from "../invitation/renderer";
import type { GuestbookDto, RsvpDto } from "./public.dto";

const UPLOADS_DIR = join(process.cwd(), "uploads");

const MEDIA_TYPES: Record<string, { type: "image" | "video" | "voice_note"; ext: string }> = {
  "image/jpeg": { type: "image", ext: "jpg" },
  "image/png": { type: "image", ext: "png" },
  "image/webp": { type: "image", ext: "webp" },
  "image/avif": { type: "image", ext: "avif" },
  "video/mp4": { type: "video", ext: "mp4" },
  "audio/mpeg": { type: "voice_note", ext: "mp3" },
  "audio/wav": { type: "voice_note", ext: "wav" },
  "audio/webm": { type: "voice_note", ext: "webm" },
};

const MAX_MEDIA_BYTES = 10 * 1024 * 1024;

export type UploadFile = { originalname: string; mimetype: string; size: number; buffer: Buffer };
type Invitation = {
  id: string;
  tenantId: string;
  templateVersionId: string;
  title: string;
  slug: string;
};

@Injectable()
export class PublicService {
  constructor(private readonly redis: RedisService) {}

  async getInvitation(slug: string, guestToken?: string) {
    const { invitation, contentJson } = await this.resolvePublishedInvitation(slug);
    const html = await this.renderOrCache(invitation);

    let guest: { name: string } | null = null;
    if (guestToken) {
      const [g] = await db
        .select({ name: guests.name })
        .from(guests)
        .where(and(eq(guests.invitationId, invitation.id), eq(guests.token, guestToken)))
        .limit(1);
      if (g) guest = { name: g.name };
    }

    return {
      title: invitation.title,
      html,
      guest,
      eventDate: this.extractEventDate(contentJson),
    };
  }

  async rsvp(slug: string, dto: RsvpDto, ip: string) {
    await assertRateLimit(this.redis.client, `public:rsvp:${slug}:${ip}`, 10, 60);
    const { invitation, contentJson } = await this.resolvePublishedInvitation(slug);

    const [guest] = await db
      .select({ id: guests.id })
      .from(guests)
      .where(and(eq(guests.invitationId, invitation.id), eq(guests.token, dto.token)))
      .limit(1);
    if (!guest) throw new NotFoundException("Guest not found");

    const eventDate = this.extractEventDate(contentJson);
    if (eventDate && new Date(eventDate) < new Date()) {
      throw new BadRequestException("RSVP period has ended");
    }

    await db
      .insert(rsvps)
      .values({
        guestId: guest.id,
        attendance: dto.attendance,
        guestCount: dto.guestCount ?? 1,
        message: dto.message ?? null,
      })
      .onConflictDoUpdate({
        target: rsvps.guestId,
        set: {
          attendance: dto.attendance,
          guestCount: dto.guestCount ?? 1,
          message: dto.message ?? null,
          respondedAt: new Date(),
        },
      });

    return { ok: true };
  }

  async listGuestbook(slug: string) {
    const { invitation } = await this.resolvePublishedInvitation(slug);
    return db
      .select({
        id: guestbooks.id,
        message: guestbooks.message,
        createdAt: guestbooks.createdAt,
        guestName: guests.name,
      })
      .from(guestbooks)
      .leftJoin(guests, eq(guests.id, guestbooks.guestId))
      .where(eq(guestbooks.invitationId, invitation.id))
      .orderBy(desc(guestbooks.createdAt))
      .limit(50);
  }

  async createGuestbook(slug: string, dto: GuestbookDto, ip: string) {
    await assertRateLimit(this.redis.client, `public:guestbook:${slug}:${ip}`, 10, 60);
    const { invitation } = await this.resolvePublishedInvitation(slug);

    const message = dto.message.replace(/<[^>]*>/g, "").trim().slice(0, 1000);
    if (!message) throw new BadRequestException("Message cannot be empty");

    let guestId: string | null = null;
    if (dto.guestToken) {
      const [g] = await db
        .select({ id: guests.id })
        .from(guests)
        .where(and(eq(guests.invitationId, invitation.id), eq(guests.token, dto.guestToken)))
        .limit(1);
      if (g) guestId = g.id;
    }

    const [row] = await db
      .insert(guestbooks)
      .values({ invitationId: invitation.id, guestId, message })
      .returning();
    return row;
  }

  async uploadMedia(slug: string, file: UploadFile | undefined, guestToken: string | undefined, ip: string) {
    await assertRateLimit(this.redis.client, `public:media:${slug}:${ip}`, 5, 60);
    const { invitation } = await this.resolvePublishedInvitation(slug);

    if (!guestToken) throw new BadRequestException("Guest token is required");
    if (!file) throw new BadRequestException("File is required");
    if (file.size > MAX_MEDIA_BYTES) throw new PayloadTooLargeException("File exceeds 10MB limit");
    const media = MEDIA_TYPES[file.mimetype];
    if (!media) throw new UnsupportedMediaTypeException("Unsupported file type");

    const [guest] = await db
      .select({ id: guests.id })
      .from(guests)
      .where(and(eq(guests.invitationId, invitation.id), eq(guests.token, guestToken)))
      .limit(1);
    if (!guest) throw new NotFoundException("Guest not found");

    const [existing] = await db
      .select({ objectKey: guestMedia.objectKey })
      .from(guestMedia)
      .where(eq(guestMedia.guestId, guest.id))
      .limit(1);
    if (existing) {
      await fs.unlink(join(UPLOADS_DIR, existing.objectKey)).catch(() => {});
      await db.delete(guestMedia).where(eq(guestMedia.guestId, guest.id));
    }

    const objectKey = `tenant/${invitation.tenantId}/${invitation.id}/guest-media/${guest.id}.${media.ext}`;
    const finalDir = join(UPLOADS_DIR, `tenant/${invitation.tenantId}/${invitation.id}/guest-media`);
    await fs.mkdir(finalDir, { recursive: true });
    await fs.writeFile(join(finalDir, `${guest.id}.${media.ext}`), file.buffer);

    await db.insert(guestMedia).values({ guestId: guest.id, mediaType: media.type, objectKey });
    return { objectKey, mediaType: media.type };
  }

  private async resolvePublishedInvitation(slug: string): Promise<{
    invitation: Invitation;
    contentJson: Record<string, unknown>;
  }> {
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.slug, slug))
      .limit(1);
    if (!invitation) throw new NotFoundException("Invitation not found");
    if (invitation.deletedAt) throw new GoneException("Invitation has been archived");
    if (invitation.status !== "published") throw new NotFoundException("Invitation not found");

    await this.assertSubscriptionActive(invitation.tenantId);

    const [content] = await db
      .select({ contentJson: invitationContents.contentJson })
      .from(invitationContents)
      .where(eq(invitationContents.invitationId, invitation.id))
      .limit(1);

    return {
      invitation: {
        id: invitation.id,
        tenantId: invitation.tenantId,
        templateVersionId: invitation.templateVersionId,
        title: invitation.title,
        slug: invitation.slug,
      },
      contentJson: (content?.contentJson ?? {}) as Record<string, unknown>,
    };
  }

  private async assertSubscriptionActive(tenantId: string) {
    const [sub] = await db
      .select({ status: subscriptions.status, expiredAt: subscriptions.expiredAt })
      .from(subscriptions)
      .where(eq(subscriptions.tenantId, tenantId))
      .limit(1);
    if (!sub || sub.status !== "active" || (sub.expiredAt && sub.expiredAt < new Date())) {
      throw new ForbiddenException("Subscription expired");
    }
  }

  private async renderOrCache(invitation: Invitation): Promise<string> {
    const cacheKey = `tenant:${invitation.tenantId}:invitation:${invitation.id}:published_html`;
    if (this.redis.client.status === "ready") {
      const cached = await this.redis.client.get(cacheKey);
      if (cached) return cached;
    }
    const [template] = await db
      .select()
      .from(templates)
      .where(eq(templates.id, invitation.templateVersionId))
      .limit(1);
    const [content] = await db
      .select({ contentJson: invitationContents.contentJson })
      .from(invitationContents)
      .where(eq(invitationContents.invitationId, invitation.id))
      .limit(1);
    const html = assembleHtml(
      renderTemplate(template?.htmlBundle ?? "", (content?.contentJson ?? {}) as Record<string, unknown>),
      template?.cssBundle ?? null,
      template?.jsBundle ?? null,
    );
    if (this.redis.client.status === "ready") {
      await this.redis.client.set(cacheKey, html);
    }
    return html;
  }

  private extractEventDate(contentJson: Record<string, unknown>): string | null {
    const countdown = contentJson.countdown as Record<string, unknown> | undefined;
    const value = countdown?.event_date;
    if (typeof value === "string" && value && !Number.isNaN(new Date(value).getTime())) {
      return value;
    }
    return null;
  }
}

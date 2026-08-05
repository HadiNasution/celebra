import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  check,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ---- Tenants ----
export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---- Users ----
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    check("users_role_check", sql`${t.role} IN ('super_admin', 'owner', 'admin', 'staff')`),
    unique("users_tenant_email").on(t.tenantId, t.email),
    index("idx_users_tenant_id").on(t.tenantId),
  ],
);

// ---- Invitations ----
export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    templateVersionId: uuid("template_version_id").notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    status: text("status").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    check("invitations_status_check", sql`${t.status} IN ('draft', 'published')`),
    unique("invitations_tenant_slug").on(t.tenantId, t.slug),
    index("idx_invitations_tenant_id").on(t.tenantId),
  ],
);

// ---- Invitation Contents ----
export const invitationContents = pgTable(
  "invitation_contents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    invitationId: uuid("invitation_id")
      .notNull()
      .references(() => invitations.id, { onDelete: "cascade" })
      .unique(),
    schemaVersion: integer("schema_version").default(1).notNull(),
    contentJson: jsonb("content_json").default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_invitation_contents_invitation_id").on(t.invitationId)],
);

// ---- Categories ----
export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---- Templates ----
export const templates = pgTable("templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => categories.id),
  name: text("name").notNull(),
  version: integer("version").default(1).notNull(),
  previewImage: text("preview_image"),
  htmlBundle: text("html_bundle").notNull(),
  cssBundle: text("css_bundle"),
  jsBundle: text("js_bundle"),
  jsonSchema: jsonb("json_schema").notNull(),
  isPremium: boolean("is_premium").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---- Guest Roles ----
export const guestRoles = pgTable("guest_roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---- Guests ----
export const guests = pgTable(
  "guests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    invitationId: uuid("invitation_id")
      .notNull()
      .references(() => invitations.id, { onDelete: "cascade" }),
    guestRoleId: uuid("guest_role_id").references(() => guestRoles.id),
    token: uuid("token").notNull(),
    name: text("name").notNull(),
    phone: text("phone"),
    attendanceStatus: text("attendance_status"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    check(
      "guests_attendance_status_check",
      sql`${t.attendanceStatus} IN ('pending', 'checked_in')`,
    ),
    unique("guests_invitation_token").on(t.invitationId, t.token),
    index("idx_guests_invitation_id").on(t.invitationId),
  ],
);

// ---- RSVPs ----
export const rsvps = pgTable("rsvps", {
  id: uuid("id").defaultRandom().primaryKey(),
  guestId: uuid("guest_id")
    .notNull()
    .references(() => guests.id, { onDelete: "cascade" })
    .unique(),
  attendance: boolean("attendance").notNull(),
  guestCount: integer("guest_count").default(1).notNull(),
  message: text("message"),
  respondedAt: timestamp("responded_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---- Guestbooks ----
export const guestbooks = pgTable(
  "guestbooks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    invitationId: uuid("invitation_id")
      .notNull()
      .references(() => invitations.id, { onDelete: "cascade" }),
    guestId: uuid("guest_id").references(() => guests.id, { onDelete: "set null" }),
    message: text("message").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_guestbooks_invitation_id").on(t.invitationId)],
);

// ---- Guest Media ----
export const guestMedia = pgTable(
  "guest_media",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guestId: uuid("guest_id")
      .notNull()
      .references(() => guests.id, { onDelete: "cascade" })
      .unique(),
    mediaType: text("media_type").notNull(),
    objectKey: text("object_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    check(
      "guest_media_type_check",
      sql`${t.mediaType} IN ('image', 'video', 'voice_note')`,
    ),
  ],
);

// ---- Publish Histories ----
export const publishHistories = pgTable(
  "publish_histories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    invitationId: uuid("invitation_id")
      .notNull()
      .references(() => invitations.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    status: text("status").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    check("publish_histories_status_check", sql`${t.status} IN ('success', 'failed')`),
    index("idx_publish_histories_invitation_id").on(t.invitationId),
  ],
);

// ---- Subscriptions ----
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" })
      .unique(),
    plan: text("plan").notNull(),
    status: text("status").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    expiredAt: timestamp("expired_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    check(
      "subscriptions_plan_check",
      sql`${t.plan} IN ('1_month', '3_months', '6_months', '12_months')`,
    ),
    check(
      "subscriptions_status_check",
      sql`${t.status} IN ('active', 'expired', 'cancelled')`,
    ),
    index("idx_subscriptions_tenant_id").on(t.tenantId),
  ],
);

// ---- Payments ----
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "set null" }),
    xenditInvoiceId: text("xendit_invoice_id").notNull().unique(),
    xenditExternalId: text("xendit_external_id").notNull().unique(),
    userEmail: text("user_email").notNull(),
    userName: text("user_name").notNull(),
    userPhone: text("user_phone"),
    plan: text("plan").notNull(),
    amount: integer("amount").notNull(),
    status: text("status").notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    expiredAt: timestamp("expired_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    check(
      "payments_status_check",
      sql`${t.status} IN ('pending', 'paid', 'expired', 'failed')`,
    ),
    index("idx_payments_tenant_id").on(t.tenantId),
  ],
);

// ---- Audit Logs ----
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: uuid("entity_id"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_audit_logs_tenant_id").on(t.tenantId),
    index("idx_audit_logs_entity").on(t.tenantId, t.entity, t.entityId),
  ],
);

// ---- Better Auth tables (read-only, managed by Better Auth adapter) ----

export const authUser = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const authSession = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const authAccount = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
  providerId: text("provider_id").notNull(),
  accountId: text("account_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const authVerification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

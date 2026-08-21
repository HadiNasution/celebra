import { Injectable, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { db, rawPool } from "../db/connection";
import { auditLogs, tenants } from "../db/schema";
import { RedisService } from "../redis/redis.service";
import { assertRateLimit } from "../common/rate-limit";
import { signToken, type AuthUser } from "./token";

type UserRow = {
  id: string;
  email: string;
  role: string;
  tenant_id: string | null;
  password_hash: string;
};

@Injectable()
export class AuthService {
  constructor(private readonly redis: RedisService) {}

  async login(email: string, password: string, ip: string) {
    await assertRateLimit(this.redis.client, `auth:login:${ip}`, 5, 15 * 60);

    const { rows } = await rawPool.query<UserRow>(
      `SELECT id, email, role, tenant_id, password_hash FROM users WHERE email = $1 LIMIT 1`,
      [email.toLowerCase()],
    );

    const row = rows[0];
    if (!row || !(await bcrypt.compare(password, row.password_hash))) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const authUser: AuthUser = {
      id: row.id,
      email: row.email,
      role: row.role,
      tenantId: row.tenant_id,
    };
    const tenantSlug = await this.resolveTenantSlug(row.tenant_id);
    return { token: signToken(authUser), user: authUser, tenantSlug };
  }

  async me(user: AuthUser) {
    const tenantSlug = await this.resolveTenantSlug(user.tenantId);
    return { user: { ...user, tenantSlug } };
  }

  async changePassword(user: AuthUser, newPassword: string) {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await rawPool.query(
      `UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2`,
      [passwordHash, user.id],
    );

    if (user.tenantId) {
      await db.insert(auditLogs).values({
        tenantId: user.tenantId,
        userId: user.id,
        action: "auth.password_changed",
        entity: "user",
        entityId: user.id,
      });
    }
    return { ok: true };
  }

  private async resolveTenantSlug(tenantId: string | null): Promise<string | null> {
    if (!tenantId) return null;
    const tenant = await db
      .select({ slug: tenants.slug })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    return tenant[0]?.slug ?? null;
  }

  async forgotPassword(email: string, ip: string) {
    await assertRateLimit(this.redis.client, `auth:forgot:${ip}`, 3, 30 * 60);

    const { rows } = await rawPool.query<{ id: string }>(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      [email.toLowerCase()],
    );

    if (rows[0]) {
      const token = randomBytes(32).toString("hex");
      if (this.redis.client.status === "ready") {
        await this.redis.client.set(`reset_token:${token}`, rows[0].id, "EX", 15 * 60);
      }
    }

    // ponytail: always succeed to avoid user enumeration; reset-password page is Phase 2
  }
}

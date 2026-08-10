import { HttpException, Injectable, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { rawPool } from "../db/connection";
import { RedisService } from "../redis/redis.service";
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
    await this.assertRateLimit(`auth:login:${ip}`, 5, 15 * 60);

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
    return { token: signToken(authUser), user: authUser };
  }

  async forgotPassword(email: string, ip: string) {
    await this.assertRateLimit(`auth:forgot:${ip}`, 3, 30 * 60);

    const { rows } = await rawPool.query<{ id: string }>(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      [email.toLowerCase()],
    );

    if (rows[0]) {
      const token = randomBytes(32).toString("hex");
      if (this.redis.client.status === "ready") {
        await this.redis.client.set(`reset_token:${token}`, rows[0].id, "EX", 15 * 60);
      }
      console.log(`[PASSWORD RESET] ${email} → /reset-password?token=${token}`);
    }

    // ponytail: always succeed to avoid user enumeration; reset-password page is Phase 2
  }

  private async assertRateLimit(key: string, limit: number, windowSec: number) {
    if (this.redis.client.status !== "ready") return; // Redis down → fail open, avoid queue hang
    try {
      const count = await this.redis.client.incr(key);
      if (count === 1) await this.redis.client.expire(key, windowSec);
      if (count > limit) throw new HttpException("Too many attempts. Try again later.", 429);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      // ponytail: Redis failure → fail open (Redis already treated as non-critical)
    }
  }
}

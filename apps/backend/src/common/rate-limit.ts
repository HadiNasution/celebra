import { HttpException } from "@nestjs/common";
import type Redis from "ioredis";

export async function assertRateLimit(
  redis: Redis,
  key: string,
  limit: number,
  windowSec: number,
) {
  if (redis.status !== "ready") return; // Redis down → fail open
  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSec);
    if (count > limit) throw new HttpException("Too many requests. Try again later.", 429);
  } catch (err) {
    if (err instanceof HttpException) throw err;
    // ponytail: Redis failure → fail open (Redis already treated as non-critical)
  }
}

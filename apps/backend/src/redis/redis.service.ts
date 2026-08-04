import { Injectable, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis;

  constructor() {
    this.client = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    this.client.connect().catch(() => {
      // ponytail: Redis not critical in MVP, continue without it
    });
  }

  async onModuleDestroy() {
    this.client.disconnect();
  }
}

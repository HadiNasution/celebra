import { Module } from "@nestjs/common";
import { RedisModule } from "../redis/redis.module";
import { PublicController } from "./public.controller";
import { PublicService } from "./public.service";

@Module({
  imports: [RedisModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}

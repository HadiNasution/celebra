import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ContactModule } from "./contact/contact.module";
import { AuthModule } from "./auth/auth.module";
import { RedisModule } from "./redis/redis.module";
import { PaymentModule } from "./checkout/payment.module";
import { CategoryModule } from "./category/category.module";
import { TemplateModule } from "./template/template.module";
import { AdminModule } from "./admin/admin.module";
import { InvitationModule } from "./invitation/invitation.module";
import { GuestModule } from "./guest/guest.module";
import { PublicModule } from "./public/public.module";
import { AuthGuard } from "./common/guards/auth.guard";

@Module({
  imports: [
    RedisModule,
    AuthModule,
    ContactModule,
    PaymentModule,
    CategoryModule,
    TemplateModule,
    AdminModule,
    InvitationModule,
    GuestModule,
    PublicModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}

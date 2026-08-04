import { Module } from "@nestjs/common";
import { PaymentController } from "./payment.controller";
import { PaymentService } from "./payment.service";
import { TenantModule } from "../tenant/tenant.module";
import { NotificationModule } from "../notification/notification.module";

@Module({
  imports: [TenantModule, NotificationModule],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}

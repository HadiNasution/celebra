import { Module } from "@nestjs/common";
import { AdminDashboardController } from "./admin-dashboard.controller";
import { AdminDashboardService } from "./admin-dashboard.service";
import { AdminCustomersController } from "./admin-customers.controller";
import { AdminCustomersService } from "./admin-customers.service";
import { AdminSubscriptionsController } from "./admin-subscriptions.controller";
import { AdminSubscriptionsService } from "./admin-subscriptions.service";
import { AdminPublishMonitorController } from "./admin-publish-monitor.controller";
import { AdminPublishMonitorService } from "./admin-publish-monitor.service";

@Module({
  controllers: [
    AdminDashboardController,
    AdminCustomersController,
    AdminSubscriptionsController,
    AdminPublishMonitorController,
  ],
  providers: [
    AdminDashboardService,
    AdminCustomersService,
    AdminSubscriptionsService,
    AdminPublishMonitorService,
  ],
})
export class AdminModule {}

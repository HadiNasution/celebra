import { Controller, Get, UseGuards } from "@nestjs/common";
import { AdminDashboardService } from "./admin-dashboard.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";

@Controller("admin/dashboard")
@UseGuards(RolesGuard)
@Roles("super_admin")
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Get()
  getMetrics() {
    return this.dashboardService.getMetrics();
  }
}

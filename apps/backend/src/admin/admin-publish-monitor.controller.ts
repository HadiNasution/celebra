import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AdminPublishMonitorService } from "./admin-publish-monitor.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";

@Controller("admin/publish-monitor")
@UseGuards(RolesGuard)
@Roles("super_admin")
export class AdminPublishMonitorController {
  constructor(private readonly monitorService: AdminPublishMonitorService) {}

  @Get()
  findAll(@Query("page") page = "1", @Query("limit") limit = "20") {
    return this.monitorService.findAll(Number(page), Number(limit));
  }
}

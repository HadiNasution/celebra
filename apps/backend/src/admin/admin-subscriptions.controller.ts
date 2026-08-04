import { Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { AdminSubscriptionsService } from "./admin-subscriptions.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";

@Controller("admin/subscriptions")
@UseGuards(RolesGuard)
@Roles("super_admin")
export class AdminSubscriptionsController {
  constructor(private readonly subsService: AdminSubscriptionsService) {}

  @Get()
  findAll(@Query("page") page = "1", @Query("limit") limit = "20") {
    return this.subsService.findAll(Number(page), Number(limit));
  }

  @Post(":id/activate")
  activate(@Param("id") id: string) {
    return this.subsService.activate(id);
  }

  @Post(":id/cancel")
  cancel(@Param("id") id: string) {
    return this.subsService.cancel(id);
  }
}

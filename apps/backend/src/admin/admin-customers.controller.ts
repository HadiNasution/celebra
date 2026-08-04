import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { AdminCustomersService } from "./admin-customers.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";

@Controller("admin/customers")
@UseGuards(RolesGuard)
@Roles("super_admin")
export class AdminCustomersController {
  constructor(private readonly customersService: AdminCustomersService) {}

  @Get()
  findAll(@Query("page") page = "1", @Query("limit") limit = "20") {
    return this.customersService.findAll(Number(page), Number(limit));
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.customersService.findOne(id);
  }
}

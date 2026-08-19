import { Body, Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { AdminCustomersService } from "./admin-customers.service";
import { UpdateTenantDto } from "./admin.dto";
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

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateTenantDto) {
    return this.customersService.update(id, dto);
  }
}

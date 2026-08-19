import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { TenantService } from "./tenant.service";
import { TenantGuard } from "../common/guards/tenant.guard";

@Controller("tenants")
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @UseGuards(TenantGuard)
  @Get(":slug")
  findBySlug(@Param("slug") slug: string) {
    return this.tenantService.findBySlug(slug);
  }
}

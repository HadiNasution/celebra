import { Controller, Get, Param } from "@nestjs/common";
import { TenantService } from "./tenant.service";
import { Public } from "../common/decorators/public.decorator";

@Controller("tenants")
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Public()
  @Get(":slug")
  findBySlug(@Param("slug") slug: string) {
    return this.tenantService.findBySlug(slug);
  }
}

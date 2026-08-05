import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { TemplateService } from "./template.service";
import { CreateTemplateDto } from "./template.dto";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Public } from "../common/decorators/public.decorator";

@Controller("templates")
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Public()
  @Get()
  findAll(@Query("categoryId") categoryId?: string) {
    return this.templateService.findAll(categoryId);
  }

  @Public()
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.templateService.findById(id);
  }

  @UseGuards(RolesGuard)
  @Roles("super_admin")
  @Post()
  create(@Body() dto: CreateTemplateDto) {
    return this.templateService.create(dto);
  }

  @UseGuards(RolesGuard)
  @Roles("super_admin")
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: Partial<{
    name: string;
    isActive: boolean;
    isPremium: boolean;
  }>) {
    return this.templateService.update(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles("super_admin")
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.templateService.remove(id);
  }
}

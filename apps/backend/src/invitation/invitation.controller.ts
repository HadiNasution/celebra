import { Body, Controller, Get, Param, Patch, Post, Put, Query, UseGuards } from "@nestjs/common";
import { InvitationService } from "./invitation.service";
import { CreateInvitationDto, UpdateContentDto } from "./invitation.dto";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../common/decorators/current-user.decorator";

@Controller("invitations")
@UseGuards(RolesGuard)
@Roles("super_admin", "owner", "admin")
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query("status") status?: string,
    @Query("includeArchived") includeArchived?: string,
  ) {
    return this.invitationService.list(user, status, includeArchived === "true");
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateInvitationDto) {
    return this.invitationService.create(user, dto);
  }

  @Get(":id")
  findOne(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.invitationService.findById(user, id);
  }

  @Get(":id/content")
  getContent(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.invitationService.getEditorData(user, id);
  }

  @Get(":id/stats")
  getStats(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.invitationService.getStats(user, id);
  }

  @Put(":id/content")
  updateContent(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateContentDto,
  ) {
    return this.invitationService.updateContent(user, id, dto.contentJson);
  }

  @Post(":id/publish")
  publish(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.invitationService.publish(user, id);
  }

  @Post(":id/duplicate")
  duplicate(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.invitationService.duplicate(user, id);
  }

  @Patch(":id/archive")
  archive(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.invitationService.archive(user, id);
  }

  @Patch(":id/restore")
  restore(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.invitationService.restore(user, id);
  }
}

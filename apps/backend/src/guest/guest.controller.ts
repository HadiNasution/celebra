import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { GuestService } from "./guest.service";
import { CreateGuestDto, ImportGuestsCsvDto, UpdateGuestDto } from "./guest.dto";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../common/decorators/current-user.decorator";

@Controller()
@UseGuards(RolesGuard)
@Roles("super_admin", "owner", "admin")
export class GuestController {
  constructor(private readonly guestService: GuestService) {}

  @Get("guest-roles")
  listRoles() {
    return this.guestService.listRoles();
  }

  @Get("invitations/:invitationId/guests")
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param("invitationId") invitationId: string,
    @Query("search") search?: string,
  ) {
    return this.guestService.list(user, invitationId, search);
  }

  @Post("invitations/:invitationId/guests")
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param("invitationId") invitationId: string,
    @Body() dto: CreateGuestDto,
  ) {
    return this.guestService.create(user, invitationId, dto);
  }

  @Put("invitations/:invitationId/guests/:guestId")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("invitationId") invitationId: string,
    @Param("guestId") guestId: string,
    @Body() dto: UpdateGuestDto,
  ) {
    return this.guestService.update(user, invitationId, guestId, dto);
  }

  @Delete("invitations/:invitationId/guests/:guestId")
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("invitationId") invitationId: string,
    @Param("guestId") guestId: string,
  ) {
    return this.guestService.remove(user, invitationId, guestId);
  }

  @Post("invitations/:invitationId/guests/import")
  importCsv(
    @CurrentUser() user: AuthenticatedUser,
    @Param("invitationId") invitationId: string,
    @Body() dto: ImportGuestsCsvDto,
  ) {
    return this.guestService.importCsv(user, invitationId, dto.csv);
  }
}

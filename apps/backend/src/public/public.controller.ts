import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Public } from "../common/decorators/public.decorator";
import { PublicService, type UploadFile } from "./public.service";
import { GuestbookDto, RsvpDto } from "./public.dto";

type MediaUploadBody = { guestToken?: string };

@Public()
@Controller("public")
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get("invitation/:slug")
  getInvitation(@Param("slug") slug: string, @Query("guest") guest?: string) {
    return this.publicService.getInvitation(slug, guest);
  }

  @Get("invitation/:slug/guestbook")
  listGuestbook(@Param("slug") slug: string) {
    return this.publicService.listGuestbook(slug);
  }

  @Post("invitation/:slug/guestbook")
  createGuestbook(@Param("slug") slug: string, @Body() dto: GuestbookDto, @Ip() ip: string) {
    return this.publicService.createGuestbook(slug, dto, ip);
  }

  @Post("invitation/:slug/rsvp")
  rsvp(@Param("slug") slug: string, @Body() dto: RsvpDto, @Ip() ip: string) {
    return this.publicService.rsvp(slug, dto, ip);
  }

  @Post("invitation/:slug/media")
  @UseInterceptors(FileInterceptor("file"))
  uploadMedia(
    @Param("slug") slug: string,
    @UploadedFile() file: UploadFile | undefined,
    @Body() body: MediaUploadBody,
    @Ip() ip: string,
  ) {
    return this.publicService.uploadMedia(slug, file, body?.guestToken, ip);
  }
}

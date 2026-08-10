import { Body, Controller, Get, HttpCode, Post, Req } from "@nestjs/common";
import { Request } from "express";
import { Public } from "../common/decorators/public.decorator";
import { AuthService } from "./auth.service";
import { ForgotPasswordDto, LoginDto } from "./dto/login.dto";
import { AuthUser } from "./token";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  @HttpCode(200)
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto.email, dto.password, req.ip ?? "");
  }

  @Public()
  @Post("forgot-password")
  @HttpCode(200)
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    await this.authService.forgotPassword(dto.email, req.ip ?? "");
    return { ok: true };
  }

  @Get("me")
  me(@Req() req: Request & { user: AuthUser }) {
    return this.authService.me(req.user);
  }
}

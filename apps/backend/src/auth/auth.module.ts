import { Module, Global } from "@nestjs/common";
import { AuthGuard } from "../common/guards/auth.guard";
import { OptionalAuthGuard } from "./auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { TenantGuard } from "../common/guards/tenant.guard";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, OptionalAuthGuard, RolesGuard, TenantGuard],
  exports: [AuthService, AuthGuard, OptionalAuthGuard, RolesGuard, TenantGuard],
})
export class AuthModule {}

import { Module, Global } from "@nestjs/common";
import { AuthGuard } from "../common/guards/auth.guard";
import { OptionalAuthGuard } from "./auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { TenantGuard } from "../common/guards/tenant.guard";

@Global()
@Module({
  providers: [AuthGuard, OptionalAuthGuard, RolesGuard, TenantGuard],
  exports: [AuthGuard, OptionalAuthGuard, RolesGuard, TenantGuard],
})
export class AuthModule {}

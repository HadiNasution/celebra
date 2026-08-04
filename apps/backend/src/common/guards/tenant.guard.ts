import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { db } from "../../db/connection";
import { tenants } from "../../db/schema";
import { eq } from "drizzle-orm";

@Injectable()
export class TenantGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return true;

    if (user.role === "super_admin") {
      if (user.tenantId === null) return true;
    }

    const slug = request.params?.slug;
    if (!slug) return true;

    const tenant = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);

    if (tenant.length === 0) throw new ForbiddenException("Tenant not found");

    if (user.tenantId !== tenant[0]!.id) {
      throw new ForbiddenException("Access denied to this tenant");
    }

    request.tenantId = tenant[0]!.id;
    return true;
  }
}

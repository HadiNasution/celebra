import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { eq } from "drizzle-orm";
import { db } from "../../db/connection";
import { tenants } from "../../db/schema";

// Resolves tenant from the :slug route param and asserts the authenticated
// user belongs to it. super_admin skips the check.
@Injectable()
export class TenantGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const slug = request.params.slug as string | undefined;
    if (!slug) return true;

    const [tenant] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);
    if (!tenant) throw new ForbiddenException("Tenant not found");

    const user = request.user as { role: string; tenantId: string | null };
    if (user.role === "super_admin") return true;
    if (user.tenantId !== tenant.id) {
      throw new ForbiddenException("You do not have access to this tenant");
    }
    return true;
  }
}
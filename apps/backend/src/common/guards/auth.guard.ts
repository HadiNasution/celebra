import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { eq, gt, and } from "drizzle-orm";
import { db } from "../../db/connection";
import { authSession, authUser, users } from "../../db/schema";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const cookie: string = request.headers.cookie ?? "";
    const match = cookie.match(/better-auth\.session_token=([^;]+)/);
    const token = match?.[1];

    if (!token) throw new UnauthorizedException("Missing session token");

    const session = await db
      .select({
        userId: authSession.userId,
        email: authUser.email,
      })
      .from(authSession)
      .innerJoin(authUser, eq(authSession.userId, authUser.id))
      .where(
        and(eq(authSession.token, token), gt(authSession.expiresAt, new Date())),
      )
      .limit(1);

    if (session.length === 0) throw new UnauthorizedException("Invalid session");

    const businessUser = await db
      .select({ role: users.role, tenantId: users.tenantId, id: users.id })
      .from(users)
      .where(eq(users.email, session[0]!.email))
      .limit(1);

    request.user = {
      id: session[0]!.userId,
      email: session[0]!.email,
      role: businessUser[0]?.role ?? "super_admin",
      tenantId: businessUser[0]?.tenantId ?? null,
    };

    return true;
  }
}

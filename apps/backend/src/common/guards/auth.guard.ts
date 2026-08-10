import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { readAuthCookie, verifyToken } from "../../auth/token";

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
    const token = readAuthCookie(request.headers.cookie);

    if (!token) throw new UnauthorizedException("Missing session token");

    const payload = verifyToken(token);
    if (!payload) throw new UnauthorizedException("Invalid or expired session");

    request.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      tenantId: payload.tenantId,
    };

    return true;
  }
}

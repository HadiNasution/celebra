import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { readAuthCookie } from "./token";

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    request.sessionToken = readAuthCookie(request.headers.cookie);
    return true;
  }
}

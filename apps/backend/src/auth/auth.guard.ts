import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const cookie: string = request.headers.cookie ?? "";
    const match = cookie.match(/better-auth\.session_token=([^;]+)/);
    request.sessionToken = match?.[1] ?? null;
    return true;
  }
}

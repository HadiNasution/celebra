import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === "string" ? res : (res as any).message ?? message;
    }

    console.error(
      `[ERROR] ${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : exception,
      exception instanceof Error ? (exception as any).cause ?? "" : "",
    );

    response.status(status).json({
      statusCode: status,
      message: Array.isArray(message) ? message[0] : message,
    });
  }
}

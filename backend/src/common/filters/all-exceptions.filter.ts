import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();

    // Spec error envelope: { success: false, error: { code, message, details } }
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const status =
        exception.code === 'P2002'
          ? HttpStatus.CONFLICT
          : exception.code === 'P2025'
            ? HttpStatus.NOT_FOUND
            : HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        error: {
          code: exception.code === 'P2002' ? 'ALREADY_EXISTS' : 'DATABASE_ERROR',
          message:
            exception.code === 'P2002'
              ? 'Resource already exists'
              : exception.code === 'P2025'
                ? 'Resource not found'
                : 'Database request failed',
          details: { prismaCode: exception.code },
        },
      });
    }

    // Domain errors thrown with { status, code } (e.g. DEVICE_NOT_FOUND)
    const domainCode = (exception as any)?.code as string | undefined;
    const domainStatus = (exception as any)?.status as number | undefined;

    const status =
      domainStatus ??
      (exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR);
    const body =
      exception instanceof HttpException ? exception.getResponse() : null;
    const message =
      typeof body === 'string'
        ? body
        : Array.isArray((body as any)?.message)
          ? (body as any).message.join(', ')
          : (body as any)?.message ??
            (exception as Error)?.message ??
            'Internal server error';

    const code =
      domainCode ??
      (status === 401
        ? 'AUTHENTICATION_FAILED'
        : status === 403
          ? 'FORBIDDEN'
          : status === 404
            ? 'RESOURCE_NOT_FOUND'
            : status === 429
              ? 'RATE_LIMITED'
              : status >= 500
                ? 'INTERNAL_ERROR'
                : 'VALIDATION_ERROR');

    // Never leak stack traces in production
    const details =
      process.env.NODE_ENV === 'production'
        ? undefined
        : { path: req.url, timestamp: new Date().toISOString() };

    return res.status(status).json({
      success: false,
      error: { code, message, details },
    });
  }
}

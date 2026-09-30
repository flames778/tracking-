import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/** Wrap success responses as { success, data, meta }. Skip for health/raw. */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest();
    return next.handle().pipe(
      map((data) => {
        if (
          data &&
          typeof data === 'object' &&
          ('success' in (data as object) || (data as any).__raw)
        ) {
          if ((data as any).__raw) return (data as any).data;
          return data;
        }
        if (req?.url?.includes('/health')) return data;
        // Already-shaped service payloads ({ data, meta? }) are passed through
        // so pagination metadata is not double-wrapped.
        if (
          data &&
          typeof data === 'object' &&
          'data' in (data as object) &&
          !('success' in (data as object))
        ) {
          return { success: true, ...(data as object) };
        }
        return { success: true, data: data ?? null };
      }),
    );
  }
}

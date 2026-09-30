import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

const SENSITIVE_KEYS = new Set(['passwordHash', 'tokenHash']);

/** Strip secrets from any outgoing payload (defense in depth). */
function strip(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  // Never recurse into Date/Buffer/Prisma Decimal — they are not plain records.
  if (obj instanceof Date) return obj;
  if (Buffer.isBuffer(obj)) return obj;
  if (Array.isArray(obj)) return obj.map(strip);
  if (typeof obj === 'object') {
    const proto = Object.getPrototypeOf(obj);
    if (proto !== Object.prototype && proto !== null) return obj;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k)) continue;
      out[k] = strip(v);
    }
    return out;
  }
  return obj;
}

@Injectable()
export class SanitizeInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => strip(data)));
  }
}

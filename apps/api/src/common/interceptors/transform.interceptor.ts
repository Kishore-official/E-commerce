import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface TransformedResponse<T> {
  success: boolean;
  data: T;
}

/**
 * Recursively convert Mongoose documents to plain objects.
 * Detects Mongoose docs by the presence of toJSON() + $__ internal state.
 */
function toPlainObject(data: any): any {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) return data.map(toPlainObject);
  if (data instanceof Date) return data;
  if (typeof data === 'object') {
    if (typeof data.toJSON === 'function' && data.$__) {
      return toPlainObject(data.toJSON());
    }
    const result: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      result[key] = toPlainObject(data[key]);
    }
    return result;
  }
  return data;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, TransformedResponse<T>> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<TransformedResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        const serialized = toPlainObject(data);
        if (serialized && typeof serialized === 'object' && 'success' in serialized) {
          return serialized;
        }
        return {
          success: true,
          data: serialized,
        };
      }),
    );
  }
}

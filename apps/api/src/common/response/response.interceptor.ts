import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, type Observable } from 'rxjs';
import { Page } from './page.js';
import { RAW_RESPONSE } from './raw-response.decorator.js';

// Every successful answer becomes { success: true, data, meta? }
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const raw = this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (raw) {
      return next.handle();
    }

    return next.handle().pipe(
      map((result: unknown) => {
        if (result instanceof StreamableFile) {
          return result;
        }
        if (result instanceof Page) {
          const { items, page, pageSize, total } = result;
          return {
            success: true,
            data: items,
            meta: { page, pageSize, total },
          };
        }
        return { success: true, data: result ?? null };
      }),
    );
  }
}

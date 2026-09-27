import { createHash, timingSafeEqual } from 'node:crypto';
import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { EnvironmentVariables } from '../../config/env.validation.js';

// Only the Next.js server knows the key
@Injectable()
export class InternalKeyGuard implements CanActivate {
  private readonly expected: Buffer;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    this.expected = digest(config.get('INTERNAL_API_KEY', { infer: true }));
  }

  canActivate(context: ExecutionContext): boolean {
    const key = context
      .switchToHttp()
      .getRequest<Request>()
      .header('x-internal-key');
    // Constant-time comparison: the answer time reveals nothing about the key
    if (!key || !timingSafeEqual(digest(key), this.expected)) {
      throw new ForbiddenException();
    }
    return true;
  }
}

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

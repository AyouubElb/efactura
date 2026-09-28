import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import type { Request } from 'express';
import { clientIp } from '../../common/auth/auth-user.js';
import { normalizeEmail } from '../../common/auth/email.js';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { OneTimeTokensService } from './one-time-tokens.service.js';
import { TokensService } from './tokens.service.js';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

@Module({
  imports: [
    // Global: AuthGuard checks tokens in every module
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        secret: config.get('JWT_ACCESS_SECRET', { infer: true }),
        signOptions: { expiresIn: 15 * 60 },
      }),
    }),
    // Login tries per 15 minutes: 20 per IP, since an office shares one; 5 per account
    ThrottlerModule.forRoot([
      {
        name: 'ip',
        ttl: FIFTEEN_MINUTES_MS,
        limit: 20,
        getTracker: (request) => clientIp(request as Request),
      },
      {
        name: 'email',
        ttl: FIFTEEN_MINUTES_MS,
        limit: 5,
        getTracker: (request) =>
          normalizeEmail(String((request as Request).body?.email ?? '')),
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, TokensService, OneTimeTokensService],
  exports: [TokensService, OneTimeTokensService],
})
export class AuthModule {}

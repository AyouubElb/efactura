import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module.js';
import { validate } from './config/env.validation.js';
import { ActivityModule } from './modules/activity/activity.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { HealthModule } from './modules/health/health.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    PrismaModule,
    ActivityModule,
    AuthModule,
    HealthModule,
  ],
})
export class AppModule {}

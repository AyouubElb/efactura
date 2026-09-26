import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module.js';
import { validate } from './config/env.validation.js';
import { HealthModule } from './modules/health/health.module.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validate }), PrismaModule, HealthModule],
})
export class AppModule {}

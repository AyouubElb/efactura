import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module.js';
import {
  type EnvironmentVariables,
  validate,
} from './config/env.validation.js';
import { ActivityModule } from './modules/activity/activity.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { ClientsModule } from './modules/clients/clients.module.js';
import { EmailWorkerModule } from './modules/email/email-worker.module.js';
import { EmailModule } from './modules/email/email.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { ProductsModule } from './modules/products/products.module.js';
import { QuotesModule } from './modules/quotes/quotes.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';
import { StorageModule } from './modules/storage/storage.module.js';
import { SuppliersModule } from './modules/suppliers/suppliers.module.js';
import { UsersModule } from './modules/users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    // One Redis connection setting for every queue
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        connection: { url: config.get('REDIS_URL', { infer: true }) },
      }),
    }),
    PrismaModule,
    ActivityModule,
    EmailModule,
    StorageModule,
    AuthModule,
    UsersModule,
    SettingsModule,
    ProductsModule,
    ClientsModule,
    SuppliersModule,
    QuotesModule,
    EmailWorkerModule,
    HealthModule,
  ],
})
export class AppModule {}

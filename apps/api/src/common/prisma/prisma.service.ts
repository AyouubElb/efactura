import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import { PrismaClient } from '../../generated/prisma/client.js';

// The API's only way to the database, with the limited key efactura_app
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: ConfigService<EnvironmentVariables, true>) {
    super({
      adapter: new PrismaPg({
        connectionString: config.get('DATABASE_URL', { infer: true }),
      }),
      // Room for a PDF drawn meanwhile on Render's slow CPU; Prisma's default is 2 s and 5 s
      transactionOptions: { maxWait: 10_000, timeout: 20_000 },
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

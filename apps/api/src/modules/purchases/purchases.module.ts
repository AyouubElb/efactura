import { join } from 'node:path';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Environment,
  InvoiceReaderMode,
  type EnvironmentVariables,
} from '../../config/env.validation.js';
import { ProductsModule } from '../products/products.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { SuppliersModule } from '../suppliers/suppliers.module.js';
import { ConfirmService } from './confirm.service.js';
import { OpenAiReader } from './extraction.service.js';
import { INVOICE_READER, type InvoiceReader } from './invoice-reader.js';
import { MatchingService } from './matching.service.js';
import { PurchasesController } from './purchases.controller.js';
import { PURCHASES_QUEUE, PurchasesQueue } from './purchases.queue.js';
import { PurchasesService } from './purchases.service.js';
import { ReadProcessor } from './read.processor.js';
import { ReplayReader } from './replay.reader.js';

// Chosen once at startup: the code asking for a reader never knows which one it got
function invoiceReader(config: ConfigService<EnvironmentVariables, true>): InvoiceReader {
  const model = config.get('OPENAI_MODEL', { infer: true });
  if (config.get('INVOICE_READER', { infer: true }) === InvoiceReaderMode.OpenAi) {
    return new OpenAiReader(config.get('OPENAI_API_KEY', { infer: true }), model);
  }
  if (config.get('NODE_ENV', { infer: true }) !== Environment.Development) {
    throw new Error('INVOICE_READER=replay is for the PC only');
  }
  return new ReplayReader(join(process.cwd(), 'prisma', 'seed', 'ai-answers', `${model}@low`));
}

@Module({
  imports: [
    // "Valider" creates suppliers and products, and checks the TVA rates
    SuppliersModule,
    ProductsModule,
    SettingsModule,
    BullModule.registerQueue({
      name: PURCHASES_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'custom' },
        removeOnComplete: true,
        // Redis Cloud's free plan holds 30 MB
        removeOnFail: 100,
      },
    }),
  ],
  controllers: [PurchasesController],
  providers: [
    PurchasesService,
    ConfirmService,
    PurchasesQueue,
    MatchingService,
    ReadProcessor,
    { provide: INVOICE_READER, inject: [ConfigService], useFactory: invoiceReader },
  ],
})
export class PurchasesModule {}

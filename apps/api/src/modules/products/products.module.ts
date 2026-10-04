import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module.js';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';

// SettingsModule exports SettingsService: the TVA rates
@Module({
  imports: [SettingsModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  // "Valider" on a supplier invoice creates products with ProductsService.insert
  exports: [ProductsService],
})
export class ProductsModule {}

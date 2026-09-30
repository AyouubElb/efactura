import { Module } from '@nestjs/common';
import { PdfModule } from '../pdf/pdf.module.js';
import { NumberingService } from './numbering.service.js';
import { SettingsController } from './settings.controller.js';
import { SettingsService } from './settings.service.js';

@Module({
  imports: [PdfModule],
  controllers: [SettingsController],
  providers: [SettingsService, NumberingService],
  exports: [SettingsService, NumberingService],
})
export class SettingsModule {}

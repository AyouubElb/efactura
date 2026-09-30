import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service.js';

// Needs no other module: settings and documents both use it without a loop
@Module({
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}

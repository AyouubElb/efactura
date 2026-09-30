import { Module } from '@nestjs/common';
import { PdfModule } from '../pdf/pdf.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { DeliveryService } from './delivery.service.js';
import { DocumentFilesService } from './document-files.service.js';
import { DocumentLinesService } from './document-lines.service.js';
import { ShareLinksController } from './share-links.controller.js';
import { ShareLinksService } from './share-links.service.js';

// What quotes, invoices and avoirs share: lines, PDFs, share links, delivery
@Module({
  imports: [SettingsModule, PdfModule],
  controllers: [ShareLinksController],
  providers: [
    DocumentLinesService,
    DocumentFilesService,
    ShareLinksService,
    DeliveryService,
  ],
  exports: [
    DocumentLinesService,
    DocumentFilesService,
    ShareLinksService,
    DeliveryService,
  ],
})
export class DocumentsModule {}

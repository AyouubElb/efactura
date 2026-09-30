import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { CreditNotesController } from './credit-notes.controller.js';
import { CreditNotesService } from './credit-notes.service.js';
import { InvoicesController } from './invoices.controller.js';
import { InvoicesService } from './invoices.service.js';

// Invoices and the avoirs that cancel them; quotes import it for "Convertir en facture"
@Module({
  imports: [SettingsModule, DocumentsModule],
  controllers: [InvoicesController, CreditNotesController],
  providers: [InvoicesService, CreditNotesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}

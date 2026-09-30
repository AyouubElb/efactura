import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module.js';
import { EmailProcessor } from './email.processor.js';

// The worker reads the queue; it needs documents, so it lives apart from the queue
@Module({
  imports: [DocumentsModule],
  providers: [EmailProcessor],
})
export class EmailWorkerModule {}

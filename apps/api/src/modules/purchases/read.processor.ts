import { createHash } from 'node:crypto';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { type Job, UnrecoverableError } from 'bullmq';
import { PDFDocument } from 'pdf-lib';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type { PurchaseInvoice } from '../../generated/prisma/client.js';
import { ActivityService } from '../activity/activity.service.js';
import { json } from '../documents/drafts.js';
import { logRedisError } from '../email/email.queue.js';
import { StorageService } from '../storage/storage.service.js';
import { startingDraft } from './draft.js';
import type { InvoiceReading } from './extraction.schema.js';
import {
  DocumentRefused,
  FILE_TYPES,
  INVOICE_READER,
  type FileType,
  type InvoiceReader,
} from './invoice-reader.js';
import { MatchingService } from './matching.service.js';
import { PURCHASES_QUEUE, retryDelay, type ReadJob } from './purchases.queue.js';

const MAX_PAGES = 5;

const DOCUMENT_WORDS: Record<InvoiceReading['document_type'], string> = {
  invoice: 'facture',
  delivery_note: 'bon de livraison',
  quote: 'devis',
  other: 'document',
};

// Two reads at a time on a slow server; idle, it asks Redis once a minute
@Processor(PURCHASES_QUEUE, {
  concurrency: 2,
  drainDelay: 60,
  stalledInterval: 300_000,
  settings: { backoffStrategy: retryDelay },
})
export class ReadProcessor extends WorkerHost {
  private readonly logger = new Logger(ReadProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly activity: ActivityService,
    private readonly matching: MatchingService,
    @Inject(INVOICE_READER) private readonly reader: InvoiceReader,
  ) {
    super();
  }

  async process(job: Job<ReadJob>): Promise<string> {
    // Each try leaves its mark: a read only looks stuck after 10 minutes without one
    const { count } = await this.prisma.purchaseInvoice.updateMany({
      where: { id: job.data.purchaseId, status: 'reading' },
      data: { attempts: job.attemptsMade + 1 },
    });
    // Discarded or read again since this job was queued
    if (count === 0) {
      return 'skipped';
    }
    const purchase = await this.prisma.purchaseInvoice.findUniqueOrThrow({
      where: { id: job.data.purchaseId },
    });
    const file = await this.storage.read(purchase.fileKey);
    if (createHash('sha256').update(file).digest('hex') !== purchase.fileSha256) {
      throw new UnrecoverableError("Le fichier reçu ne correspond pas à l'empreinte annoncée");
    }
    const type = fileType(purchase);
    const pageCount = await countPages(file, type);
    const reading = await this.reader.read(file, type).catch((error: unknown) => {
      throw error instanceof DocumentRefused ? new UnrecoverableError(error.message) : error;
    });
    const answer = reading.answer as InvoiceReading;
    const supplierId = await this.supplierWithIce(answer.supplier.ice);
    const draft = startingDraft(answer, supplierId, await this.matching.match(supplierId, answer.lines));

    // A purchase discarded meanwhile stays discarded
    const saved = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.purchaseInvoice.updateMany({
        where: { id: purchase.id, status: 'reading' },
        data: {
          status: 'ready',
          pageCount,
          proposal: json(answer),
          reviewDraft: json(draft),
          aiModel: reading.model,
          aiInputTokens: reading.inputTokens,
          aiOutputTokens: reading.outputTokens,
          aiCostMicroUsd: reading.costMicroUsd,
          attempts: job.attemptsMade + 1,
          error: null,
        },
      });
      if (count === 0) {
        return false;
      }
      await this.activity.record(
        tx,
        null,
        'purchase.read',
        { type: 'purchase_invoice', id: purchase.id },
        `lecture terminée : ${DOCUMENT_WORDS[answer.document_type]} ${answer.invoice_number ?? 'sans numéro'} de ${answer.supplier.name ?? 'fournisseur illisible'}, ${answer.lines.length} lignes`,
        { model: reading.model, costMicroUsd: reading.costMicroUsd },
      );
      return true;
    });
    return saved ? 'ready' : 'skipped';
  }

  // Only a full ICE finds a supplier: a misread one must not pick the wrong card
  private async supplierWithIce(ice: string | null): Promise<string | null> {
    const digits = ice?.replace(/\s+/g, '');
    if (!digits || !/^\d{15}$/.test(digits)) {
      return null;
    }
    const supplier = await this.prisma.supplier.findUnique({
      where: { ice: digits },
      select: { id: true },
    });
    return supplier?.id ?? null;
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<ReadJob> | undefined, error: Error) {
    if (!job) {
      return;
    }
    const final =
      error.name === 'UnrecoverableError' ||
      job.attemptsMade >= (job.opts.attempts ?? 1);
    if (!final) {
      this.logger.warn(`Read try ${job.attemptsMade} of ${job.data.purchaseId} failed: ${error.message}`);
      return;
    }
    this.logger.warn(`Read of ${job.data.purchaseId} failed after ${job.attemptsMade} tries: ${error.message}`);
    // Our own reasons are in French; a network or OpenAI error isn't
    const reason =
      error.name === 'UnrecoverableError'
        ? error.message
        : `La lecture a échoué ${job.attemptsMade} fois : utilisez « Relancer »`;
    try {
      await this.prisma.$transaction(async (tx) => {
        const { count } = await tx.purchaseInvoice.updateMany({
          where: { id: job.data.purchaseId, status: 'reading' },
          data: { status: 'failed', error: reason, attempts: job.attemptsMade },
        });
        if (count > 0) {
          await this.activity.record(
            tx,
            null,
            'purchase.read_failed',
            { type: 'purchase_invoice', id: job.data.purchaseId },
            `lecture échouée : ${reason}`,
            { error: error.message, attempts: job.attemptsMade },
          );
        }
      });
    } catch (recordError) {
      this.logger.error('Could not record the failed read', recordError);
    }
  }

  @OnWorkerEvent('error')
  onError(error: Error) {
    logRedisError(this.logger, error);
  }
}

function fileType(purchase: PurchaseInvoice): FileType {
  const type = FILE_TYPES.find((known) => known === purchase.fileType);
  if (!type) {
    throw new UnrecoverableError(`Type de fichier non lu : ${purchase.fileType}`);
  }
  return type;
}

// The page cap keeps one read small: a 40-page file is not one invoice
async function countPages(file: Buffer, type: FileType): Promise<number> {
  if (type !== 'application/pdf') {
    return 1;
  }
  let pages: number;
  try {
    const pdf = await PDFDocument.load(file, { ignoreEncryption: true, updateMetadata: false });
    pages = pdf.getPageCount();
  } catch {
    throw new UnrecoverableError('PDF illisible : envoyez une photo ou un autre PDF');
  }
  if (pages > MAX_PAGES) {
    throw new UnrecoverableError(`Le PDF a ${pages} pages : ${MAX_PAGES} au maximum`);
  }
  return pages;
}

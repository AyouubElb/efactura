import { todayInMorocco, type TvaBreakdownRow } from '@efactura/shared';
import {
  ConflictException,
  Injectable,
  Logger,
  StreamableFile,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type {
  Client,
  DocumentType,
  Prisma,
  QuoteLine,
} from '../../generated/prisma/client.js';
import { SettingsService } from '../settings/settings.service.js';
import { StorageService } from '../storage/storage.service.js';
import { minusBreakdown, minusLine } from './avoir.js';
import { settingsMissing } from './drafts.js';
import { displayNumber, isoDay, pdfKey } from './numbers.js';
import { PdfService } from '../pdf/pdf.service.js';
import type { Printable, PrintableLine } from '../pdf/printable.js';
import {
  clientSnapshot,
  shopSnapshot,
  type ClientSnapshot,
  type ShopSnapshot,
} from './snapshots.js';

export interface DocumentState {
  draft: boolean;
  // DV-2026-0009-v2; a first draft has none yet
  number: string | null;
  pdfKey: string | null;
}

export interface PdfFile {
  bytes: Buffer;
  fileName: string;
}

const NAMES: Record<DocumentType, string> = {
  quote: 'devis',
  invoice: 'facture',
  credit_note: 'avoir',
};

// "du devis DV-2026-0009", "de la facture FA-2026-0016": for history sentences
export function ofDocument(kind: DocumentType, number: string): string {
  const of = { quote: 'du devis', invoice: 'de la facture', credit_note: "de l'avoir" };
  return `${of[kind]} ${number}`;
}

// A file, not JSON: the answer wrapper lets a StreamableFile through untouched
export function pdfStream({ bytes, fileName }: PdfFile): StreamableFile {
  return new StreamableFile(bytes, {
    type: 'application/pdf',
    disposition: `inline; filename="${fileName}"`,
  });
}

const LINES = { orderBy: { position: 'asc' } } as const;

@Injectable()
export class DocumentFilesService {
  private readonly logger = new Logger(DocumentFilesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly pdf: PdfService,
    private readonly settings: SettingsService,
  ) {}

  async describe(kind: DocumentType, id: string): Promise<DocumentState> {
    switch (kind) {
      case 'quote': {
        const quote = await this.prisma.quote.findUniqueOrThrow({
          where: { id },
          select: { status: true, number: true, version: true, pdfKey: true },
        });
        return {
          draft: quote.status === 'draft',
          number: displayNumber(quote.number, quote.version),
          pdfKey: quote.pdfKey,
        };
      }
      case 'invoice': {
        const invoice = await this.prisma.invoice.findUniqueOrThrow({
          where: { id },
          select: { status: true, number: true, pdfKey: true },
        });
        return {
          draft: invoice.status === 'draft',
          number: invoice.number,
          pdfKey: invoice.pdfKey,
        };
      }
      case 'credit_note': {
        // An avoir is numbered and sent the moment it is created
        const note = await this.prisma.creditNote.findUniqueOrThrow({
          where: { id },
          select: { number: true, pdfKey: true },
        });
        return { draft: false, number: note.number, pdfKey: note.pdfKey };
      }
    }
  }

  // What a person downloads: a draft made now, or the kept PDF of a sent document
  async download(kind: DocumentType, id: string): Promise<PdfFile> {
    const state = await this.describe(kind, id);
    if (state.draft) {
      return {
        bytes: await this.render(await this.printable(kind, id)),
        fileName: `${state.number ?? NAMES[kind]}-brouillon.pdf`,
      };
    }
    return this.read(kind, id);
  }

  async read(kind: DocumentType, id: string): Promise<PdfFile> {
    const { key, fileName, bytes } = await this.keep(kind, id);
    return { bytes: bytes ?? (await this.storage.read(key)), fileName };
  }

  // The storage key of a sent document's PDF, made the first time it is needed
  async ensure(kind: DocumentType, id: string): Promise<string> {
    return (await this.keep(kind, id)).key;
  }

  // Right after the commit: a PDF that fails here is made at its first need
  async ensureQuietly(kind: DocumentType, id: string): Promise<void> {
    try {
      await this.ensure(kind, id);
    } catch (error) {
      this.logger.warn(
        `PDF of ${kind} ${id} not made yet: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async keep(kind: DocumentType, id: string) {
    const state = await this.describe(kind, id);
    if (state.draft || !state.number) {
      throw new ConflictException({
        code: 'NOT_SENT',
        message: 'Ce document est encore un brouillon',
      });
    }
    const fileName = `${state.number}.pdf`;
    if (state.pdfKey) {
      return { key: state.pdfKey, fileName, bytes: null };
    }
    const printable = await this.printable(kind, id);
    const key = pdfKey(state.number, printable.validUntil);
    const bytes = await this.render(printable);
    await this.storage.save(key, bytes, 'application/pdf', fileName);
    await this.markKept(kind, id, key, printable.validUntil);
    this.logger.log(`PDF made: ${key}`);
    return { key, fileName, bytes };
  }

  // Plain SQL keeps updated_at; a quote extended while its PDF was made is skipped
  private async markKept(
    kind: DocumentType,
    id: string,
    key: string,
    validUntil: string | null,
  ) {
    switch (kind) {
      case 'quote':
        await this.prisma.$executeRaw`
          UPDATE quotes SET pdf_key = ${key}
           WHERE id = ${id}::uuid AND pdf_key IS NULL
             AND valid_until IS NOT DISTINCT FROM ${validUntil}::date`;
        return;
      case 'invoice':
        await this.prisma.$executeRaw`
          UPDATE invoices SET pdf_key = ${key}
           WHERE id = ${id}::uuid AND pdf_key IS NULL`;
        return;
      case 'credit_note':
        await this.prisma.creditNote.updateMany({
          where: { id, pdfKey: null },
          data: { pdfKey: key },
        });
        return;
    }
  }

  private async printable(kind: DocumentType, id: string): Promise<Printable> {
    switch (kind) {
      case 'quote': {
        const quote = await this.prisma.quote.findUniqueOrThrow({
          where: { id },
          include: { client: true, lines: LINES },
        });
        const draft = quote.status === 'draft';
        return {
          kind,
          number: displayNumber(quote.number, quote.version),
          draft,
          issueDate: isoDay(quote.issueDate),
          validUntil: isoDay(quote.validUntil),
          dueDate: null,
          cancelledInvoice: null,
          reason: null,
          ...(draft ? await this.liveCopies(quote.client) : sentCopies(quote)),
          lines: quote.lines.map(printableLine),
          totalHtCentimes: quote.totalHtCentimes,
          totalTvaCentimes: quote.totalTvaCentimes,
          totalTtcCentimes: quote.totalTtcCentimes,
          tvaBreakdown: breakdown(quote.tvaBreakdown),
          totalInWords: quote.totalInWords,
          notes: quote.notes,
          madeAt: quote.sentAt ?? new Date(),
        };
      }
      case 'invoice': {
        const invoice = await this.prisma.invoice.findUniqueOrThrow({
          where: { id },
          include: { client: true, lines: LINES },
        });
        const draft = invoice.status === 'draft';
        return {
          kind,
          number: invoice.number,
          draft,
          issueDate: isoDay(invoice.issueDate),
          validUntil: null,
          dueDate: isoDay(invoice.dueDate),
          cancelledInvoice: null,
          reason: null,
          ...(draft ? await this.liveCopies(invoice.client) : sentCopies(invoice)),
          lines: invoice.lines.map(printableLine),
          totalHtCentimes: invoice.totalHtCentimes,
          totalTvaCentimes: invoice.totalTvaCentimes,
          totalTtcCentimes: invoice.totalTtcCentimes,
          tvaBreakdown: breakdown(invoice.tvaBreakdown),
          totalInWords: invoice.totalInWords,
          notes: invoice.notes,
          madeAt: invoice.sentAt ?? new Date(),
        };
      }
      case 'credit_note': {
        const note = await this.prisma.creditNote.findUniqueOrThrow({
          where: { id },
          include: { invoice: { include: { lines: LINES } } },
        });
        // No lines of its own: the invoice it cancels, every amount negative
        return {
          kind,
          number: note.number,
          draft: false,
          issueDate: todayInMorocco(note.createdAt),
          validUntil: null,
          dueDate: null,
          cancelledInvoice: note.invoice.number,
          reason: note.reason,
          ...sentCopies(note),
          lines: note.invoice.lines.map((line) => minusLine(printableLine(line))),
          totalHtCentimes: note.totalHtCentimes,
          totalTvaCentimes: note.totalTvaCentimes,
          totalTtcCentimes: note.totalTtcCentimes,
          tvaBreakdown: minusBreakdown(breakdown(note.invoice.tvaBreakdown)),
          totalInWords: note.totalInWords,
          notes: null,
          madeAt: note.createdAt,
        };
      }
    }
  }

  // A draft prints today's shop and client; a sent document, its copies
  private async liveCopies(client: Client) {
    const settings = await this.settings.current();
    if (!settings) {
      throw settingsMissing();
    }
    return { shop: shopSnapshot(settings), client: clientSnapshot(client) };
  }

  private async render(doc: Printable): Promise<Buffer> {
    const { logoKey } = doc.shop;
    // A logo lost from storage prints nothing rather than blocking the document
    const logo = logoKey ? await this.storage.readIfExists(logoKey) : null;
    if (logoKey && !logo) {
      this.logger.warn(`Logo missing from storage: ${logoKey}`);
    }
    return this.pdf.render(
      doc,
      logo,
      logoKey?.endsWith('.png') ? 'image/png' : 'image/jpeg',
    );
  }
}

function sentCopies(row: {
  shopSnapshot: Prisma.JsonValue;
  clientSnapshot: Prisma.JsonValue;
}) {
  return {
    shop: row.shopSnapshot as unknown as ShopSnapshot,
    client: row.clientSnapshot as unknown as ClientSnapshot,
  };
}

function breakdown(value: Prisma.JsonValue): TvaBreakdownRow[] {
  return (value ?? []) as unknown as TvaBreakdownRow[];
}

type LineRow = Pick<
  QuoteLine,
  | 'label'
  | 'reference'
  | 'unit'
  | 'quantity'
  | 'unitPriceHtCentimes'
  | 'tvaRateBp'
  | 'lineTotalHtCentimes'
>;

function printableLine(line: LineRow): PrintableLine {
  return {
    label: line.label,
    reference: line.reference,
    unit: line.unit,
    quantity: line.quantity.toString(),
    unitPriceHtCentimes: line.unitPriceHtCentimes,
    tvaRateBp: line.tvaRateBp,
    lineTotalHtCentimes: line.lineTotalHtCentimes,
  };
}

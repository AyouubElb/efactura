import type { TvaBreakdownRow } from '@efactura/shared';
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type {
  Client,
  DocumentType,
  QuoteLine,
} from '../../generated/prisma/client.js';
import { SettingsService } from '../settings/settings.service.js';
import { StorageService } from '../storage/storage.service.js';
import { dayToDate, displayNumber, isoDay, pdfKey } from './numbers.js';
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
      default:
        throw new NotFoundException();
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

  // Set once, and only if the quote wasn't extended while its PDF was being made
  private async markKept(
    kind: DocumentType,
    id: string,
    key: string,
    validUntil: string | null,
  ) {
    const data = { pdfKey: key };
    switch (kind) {
      case 'quote':
        await this.prisma.quote.updateMany({
          where: {
            id,
            pdfKey: null,
            validUntil: validUntil ? dayToDate(validUntil) : null,
          },
          data,
        });
        return;
      default:
        throw new NotFoundException();
    }
  }

  private async printable(kind: DocumentType, id: string): Promise<Printable> {
    switch (kind) {
      case 'quote': {
        const quote = await this.prisma.quote.findUniqueOrThrow({
          where: { id },
          include: { client: true, lines: { orderBy: { position: 'asc' } } },
        });
        const draft = quote.status === 'draft';
        const copies = draft
          ? await this.liveCopies(quote.client)
          : {
              shop: quote.shopSnapshot as unknown as ShopSnapshot,
              client: quote.clientSnapshot as unknown as ClientSnapshot,
            };
        return {
          kind,
          number: displayNumber(quote.number, quote.version),
          draft,
          issueDate: isoDay(quote.issueDate),
          validUntil: isoDay(quote.validUntil),
          dueDate: null,
          cancelledInvoice: null,
          reason: null,
          ...copies,
          lines: quote.lines.map(printableLine),
          totalHtCentimes: quote.totalHtCentimes,
          totalTvaCentimes: quote.totalTvaCentimes,
          totalTtcCentimes: quote.totalTtcCentimes,
          tvaBreakdown: (quote.tvaBreakdown ?? []) as unknown as TvaBreakdownRow[],
          totalInWords: quote.totalInWords,
          notes: quote.notes,
          madeAt: quote.sentAt ?? new Date(),
        };
      }
      default:
        throw new NotFoundException();
    }
  }

  // A draft prints today's shop and client; a sent document, its copies
  private async liveCopies(client: Client) {
    const settings = await this.settings.current();
    if (!settings) {
      throw new ConflictException({
        code: 'SETTINGS_MISSING',
        message: "Remplissez d'abord les paramètres de la boutique",
      });
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

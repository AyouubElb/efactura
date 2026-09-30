import { addDays, formatDate, todayInMorocco } from '@efactura/shared';
import { ConflictException, Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { lockRow } from '../../common/prisma/lock-row.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { Page } from '../../common/response/page.js';
import {
  Prisma,
  type Invoice,
  type PaymentMethod,
  type QuoteStatus,
  type SendChannel,
} from '../../generated/prisma/client.js';
import { ActivityService } from '../activity/activity.service.js';
import { changes } from '../activity/changes.js';
import { DeliveryService } from '../documents/delivery.service.js';
import {
  DocumentFilesService,
  type PdfFile,
} from '../documents/document-files.service.js';
import {
  documentTotals,
  DocumentLinesService,
} from '../documents/document-lines.service.js';
import {
  activeClient,
  assertRatesOffered,
  CHANNEL_WORDS,
  draftSummary,
  invalid,
  isDay,
  json,
  sameLines,
  settingsMissing,
  storedLine,
  totalsData,
} from '../documents/drafts.js';
import type { TvaRowDto } from '../documents/dto/document-line.dto.js';
import { dayToDate, displayNumber, isoDay } from '../documents/numbers.js';
import { ShareLinksService } from '../documents/share-links.service.js';
import {
  clientSnapshot,
  shopSnapshot,
  type ClientSnapshot,
  type ShopSnapshot,
} from '../documents/snapshots.js';
import { NumberingService } from '../settings/numbering.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { CreditNotesService } from './credit-notes.service.js';
import type {
  CancelInvoiceDto,
  CreateInvoiceDto,
  InvoiceCancelledDto,
  InvoiceDeliveredDto,
  InvoiceDetailDto,
  InvoiceDto,
  InvoiceListQueryDto,
  PayInvoiceDto,
  UpdateInvoiceDto,
} from './dto/invoices.dto.js';

const PAYMENT_WORDS: Record<PaymentMethod, string> = {
  cash: 'espèces',
  cheque: 'chèque',
  transfer: 'virement',
  card: 'carte',
  effet: 'effet',
};

// Only an accepted quote becomes an invoice
const NOT_ACCEPTED: Record<Exclude<QuoteStatus, 'accepted'>, string> = {
  draft: "Envoyez d'abord ce devis, puis marquez-le accepté",
  sent: "Marquez d'abord ce devis accepté",
  refused: 'Ce devis est refusé : il ne devient pas une facture',
  replaced: 'Ce devis est remplacé : convertissez sa dernière version',
};

const USER = { select: { id: true, fullName: true } } as const;

const LIST = {
  include: { client: { select: { id: true, name: true } } },
} satisfies Prisma.InvoiceDefaultArgs;

const DETAIL = {
  include: {
    client: { select: { id: true, name: true } },
    lines: { orderBy: { position: 'asc' } },
    quote: { select: { id: true, number: true, version: true } },
    creditNote: { select: { id: true, number: true, reason: true } },
    createdBy: USER,
    sentBy: USER,
    paidRecordedBy: USER,
  },
} satisfies Prisma.InvoiceDefaultArgs;

type ListRow = Prisma.InvoiceGetPayload<typeof LIST>;

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
    private readonly settings: SettingsService,
    private readonly numbering: NumberingService,
    private readonly lines: DocumentLinesService,
    private readonly files: DocumentFilesService,
    private readonly shareLinks: ShareLinksService,
    private readonly delivery: DeliveryService,
    private readonly creditNotes: CreditNotesService,
  ) {}

  async list({
    page,
    pageSize,
    status,
    clientId,
  }: InvoiceListQueryDto): Promise<Page<InvoiceDto>> {
    const today = dayToDate(todayInMorocco());
    // "En retard" is a question asked now, never a stored status
    const where: Prisma.InvoiceWhereInput =
      status === 'late'
        ? { clientId, status: 'sent', dueDate: { lt: today } }
        : status === 'sent'
          ? { clientId, status: 'sent', dueDate: { gte: today } }
          : { clientId, status };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        ...LIST,
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return new Page(
      rows.map((row) => toDto(row, today)),
      page,
      pageSize,
      total,
    );
  }

  async get(id: string, reader: AuthUser): Promise<InvoiceDetailDto> {
    const row = await this.prisma.invoice.findUniqueOrThrow({
      ...DETAIL,
      where: { id },
    });
    return Object.assign(toDto(row, dayToDate(todayInMorocco())), {
      lines: row.lines.map(storedLine),
      tvaBreakdown: (row.tvaBreakdown ?? []) as unknown as TvaRowDto[],
      totalInWords: row.totalInWords,
      notes: row.notes,
      clientSnapshot: row.clientSnapshot as unknown as ClientSnapshot | null,
      shopSnapshot: row.shopSnapshot as unknown as ShopSnapshot | null,
      quote: row.quote
        ? {
            id: row.quote.id,
            number: displayNumber(row.quote.number, row.quote.version) as string,
          }
        : null,
      creditNote: row.creditNote,
      paymentReference: row.paymentReference,
      paidRecordedBy: row.paidRecordedBy,
      pdfReady: row.pdfKey !== null,
      shareLink:
        row.status === 'draft'
          ? null
          : await this.shareLinks.currentDto('invoice', id),
      createdBy: row.createdBy,
      sentBy: row.sentBy,
      history: await this.activity.forEntity({ type: 'invoice', id }, reader),
    });
  }

  // A direct invoice, without a quote: a walk-in client
  async create(dto: CreateInvoiceDto, user: AuthUser): Promise<InvoiceDetailDto> {
    const client = await activeClient(this.prisma, dto.clientId);
    const { lines, totals } = await this.lines.prepare(dto.lines);
    const id = await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          clientId: client.id,
          notes: dto.notes ?? null,
          createdById: user.id,
          ...totalsData(totals),
          lines: { create: lines },
        },
      });
      await this.activity.record(
        tx,
        user,
        'invoice.created',
        { type: 'invoice', id: invoice.id },
        `a créé une facture pour ${client.name} (brouillon)`,
      );
      return invoice.id;
    });
    return this.get(id, user);
  }

  // "Convertir en facture": a draft with the quote's lines, still editable; a quote converts once
  async fromQuote(quoteId: string, user: AuthUser): Promise<InvoiceDetailDto> {
    const id = await this.prisma.$transaction(async (tx) => {
      // Two clicks at once: the second waits here, then finds the first one's invoice
      await lockRow(tx, 'quotes', quoteId);
      const quote = await tx.quote.findUniqueOrThrow({
        where: { id: quoteId },
        include: {
          lines: { orderBy: { position: 'asc' } },
          invoice: { select: { number: true } },
        },
      });
      if (quote.invoice) {
        throw new ConflictException({
          code: 'ALREADY_CONVERTED',
          message: quote.invoice.number
            ? `Ce devis est déjà converti : facture ${quote.invoice.number}`
            : 'Ce devis est déjà converti : sa facture est en brouillon',
        });
      }
      if (quote.status !== 'accepted') {
        throw new ConflictException({
          code: 'QUOTE_NOT_ACCEPTED',
          message: NOT_ACCEPTED[quote.status],
        });
      }
      const quoteNumber = displayNumber(quote.number, quote.version) as string;
      const lines = quote.lines.map(storedLine);
      const invoice = await tx.invoice.create({
        data: {
          clientId: quote.clientId,
          quoteId: quote.id,
          notes: quote.notes,
          createdById: user.id,
          ...totalsData(documentTotals(lines).totals),
          lines: { create: lines },
        },
      });
      await this.activity.record(
        tx,
        user,
        'invoice.created',
        { type: 'invoice', id: invoice.id },
        `a créé une facture depuis le devis ${quoteNumber} (brouillon)`,
      );
      await this.activity.record(
        tx,
        user,
        'quote.converted',
        { type: 'quote', id: quote.id },
        `a converti le devis ${quoteNumber} en facture (brouillon)`,
      );
      return invoice.id;
    });
    return this.get(id, user);
  }

  async update(
    id: string,
    dto: UpdateInvoiceDto,
    user: AuthUser,
  ): Promise<InvoiceDetailDto> {
    const current = await this.prisma.invoice.findUniqueOrThrow({
      where: { id },
      include: { client: true, lines: true },
    });
    assertDraft(current);
    const newClient = dto.clientId !== undefined && dto.clientId !== current.clientId;
    if (newClient && current.quoteId) {
      throw invalid('clientId', "Une facture issue d'un devis garde le client du devis");
    }
    const client = newClient
      ? await activeClient(this.prisma, dto.clientId as string)
      : current.client;
    const prepared = dto.lines
      ? await this.lines.prepare(
          dto.lines,
          current.lines.flatMap((line) => (line.productId ? [line.productId] : [])),
        )
      : null;

    await this.prisma.$transaction(async (tx) => {
      await lockRow(tx, 'invoices', id);
      const before = await tx.invoice.findUniqueOrThrow({
        where: { id },
        include: { client: true, lines: { orderBy: { position: 'asc' } } },
      });
      assertDraft(before);
      const beforeLines = before.lines.map(storedLine);
      const afterLines = prepared?.lines ?? beforeLines;
      const notes = dto.notes === undefined ? before.notes : dto.notes;
      if (
        client.id === before.clientId &&
        notes === before.notes &&
        sameLines(beforeLines, afterLines)
      ) {
        return;
      }
      await tx.invoice.update({
        where: { id },
        data: {
          clientId: client.id,
          notes,
          ...(prepared && {
            ...totalsData(prepared.totals),
            lines: { deleteMany: {}, create: prepared.lines },
          }),
        },
      });
      const totalAfter = prepared?.totals.totalTtcCentimes ?? before.totalTtcCentimes;
      await this.activity.record(
        tx,
        user,
        'invoice.updated',
        { type: 'invoice', id },
        `a modifié le brouillon de facture pour ${client.name}`,
        changes(
          draftSummary(before.client.name, beforeLines.length, before.totalTtcCentimes, before.notes),
          draftSummary(client.name, afterLines.length, totalAfter, notes),
        ) ?? undefined,
      );
    });
    return this.get(id, user);
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await lockRow(tx, 'invoices', id);
      const invoice = await tx.invoice.findUniqueOrThrow({
        where: { id },
        include: {
          client: { select: { name: true } },
          quote: { select: { id: true, number: true, version: true } },
        },
      });
      assertDraft(invoice);
      // A draft has no number yet: deleting it leaves no hole
      await tx.invoice.delete({ where: { id } });
      await this.activity.record(
        tx,
        user,
        'invoice.deleted',
        { type: 'invoice', id },
        `a supprimé le brouillon de facture pour ${invoice.client.name}`,
      );
      // The quote may be converted again
      if (invoice.quote) {
        await this.activity.record(
          tx,
          user,
          'quote.conversion_deleted',
          { type: 'quote', id: invoice.quote.id },
          `a supprimé la facture en brouillon du devis ${displayNumber(invoice.quote.number, invoice.quote.version)}`,
        );
      }
    });
  }

  pdf(id: string): Promise<PdfFile> {
    return this.files.download('invoice', id);
  }

  // One short transaction: number, copies, due date, history. The PDF and the delivery come after
  async send(
    id: string,
    channel: SendChannel,
    user: AuthUser,
  ): Promise<InvoiceDeliveredDto> {
    const settings = await this.settings.current();
    if (!settings) {
      throw settingsMissing();
    }
    // Before any number is taken
    await this.delivery.assertCanDeliver('invoice', id, channel);
    const today = todayInMorocco();

    const number = await this.prisma.$transaction(async (tx) => {
      await lockRow(tx, 'invoices', id);
      const invoice = await tx.invoice.findUniqueOrThrow({
        where: { id },
        include: { client: true, lines: { orderBy: { position: 'asc' } } },
      });
      if (invoice.status !== 'draft') {
        throw new ConflictException({
          code: 'NOT_DRAFT',
          message: 'Cette facture est déjà envoyée : pour la transmettre à nouveau, utilisez « Renvoyer »',
        });
      }
      // Art. 145 of the CGI: an invoice to a company prints its address
      if (invoice.client.type === 'company' && !invoice.client.address) {
        throw new ConflictException({
          code: 'CLIENT_ADDRESS_MISSING',
          message: "L'adresse de ce client manque : elle est obligatoire sur une facture à une société",
        });
      }
      assertRatesOffered(invoice.lines, settings.tvaRatesBp);

      const number = await this.numbering.next(tx, 'FA', Number(today.slice(0, 4)));
      const { totals } = documentTotals(invoice.lines.map(storedLine));
      await tx.invoice.update({
        where: { id },
        data: {
          status: 'sent',
          number,
          issueDate: dayToDate(today),
          dueDate: dayToDate(addDays(today, invoice.client.paymentDays)),
          clientSnapshot: json(clientSnapshot(invoice.client)),
          shopSnapshot: json(shopSnapshot(settings)),
          ...totalsData(totals),
          sentVia: channel,
          sentAt: new Date(),
          sentById: user.id,
        },
      });
      await this.activity.record(
        tx,
        user,
        'invoice.sent',
        { type: 'invoice', id },
        `a envoyé la facture ${number} ${CHANNEL_WORDS[channel]}`,
      );
      return number;
    });

    await this.files.ensureQuietly('invoice', id);
    const delivery = await this.delivery.deliverAfterSend(
      'invoice',
      id,
      channel,
      user,
      `Facture ${number} envoyée`,
    );
    return { invoice: await this.get(id, user), delivery };
  }

  // Delivering again never touches the number
  async deliver(
    id: string,
    channel: SendChannel,
    user: AuthUser,
  ): Promise<InvoiceDeliveredDto> {
    const invoice = await this.prisma.invoice.findUniqueOrThrow({ where: { id } });
    if (invoice.status === 'draft') {
      throw notSentYet();
    }
    const delivery = await this.delivery.deliver('invoice', id, channel, user);
    await this.activity.record(
      this.prisma,
      user,
      'invoice.delivered',
      { type: 'invoice', id },
      `a renvoyé la facture ${invoice.number} ${CHANNEL_WORDS[channel]}`,
    );
    return { invoice: await this.get(id, user), delivery };
  }

  // Paid all at once, on a day a person states: the app never talks to the bank
  async pay(
    id: string,
    { paidOn, method, reference = null }: PayInvoiceDto,
    user: AuthUser,
  ): Promise<InvoiceDetailDto> {
    if (!isDay(paidOn)) {
      throw invalid('paidOn', 'Date invalide');
    }
    if (paidOn > todayInMorocco()) {
      throw invalid('paidOn', 'La date de paiement ne peut pas être dans le futur');
    }
    await this.prisma.$transaction(async (tx) => {
      await lockRow(tx, 'invoices', id);
      const invoice = await tx.invoice.findUniqueOrThrow({ where: { id } });
      // A second click with the same payment changes nothing
      if (
        invoice.status === 'paid' &&
        isoDay(invoice.paidOn) === paidOn &&
        invoice.paymentMethod === method &&
        invoice.paymentReference === reference
      ) {
        return;
      }
      assertOpen(invoice);
      const issued = isoDay(invoice.issueDate) as string;
      if (paidOn < issued) {
        throw invalid(
          'paidOn',
          `Le paiement ne peut pas précéder la facture, datée du ${formatDate(issued)}`,
        );
      }
      await tx.invoice.update({
        where: { id },
        data: {
          status: 'paid',
          paidOn: dayToDate(paidOn),
          paymentMethod: method,
          paymentReference: reference,
          paidRecordedById: user.id,
        },
      });
      await this.activity.record(
        tx,
        user,
        'invoice.paid',
        { type: 'invoice', id },
        `a marqué la facture ${invoice.number} payée (${PAYMENT_WORDS[method]}, le ${formatDate(paidOn)})`,
      );
    });
    return this.get(id, user);
  }

  // Admin only: a payment entered by mistake; what it said stays in the history
  async unpay(id: string, admin: AuthUser): Promise<InvoiceDetailDto> {
    await this.prisma.$transaction(async (tx) => {
      await lockRow(tx, 'invoices', id);
      const invoice = await tx.invoice.findUniqueOrThrow({
        where: { id },
        include: { paidRecordedBy: { select: { fullName: true } } },
      });
      if (invoice.status === 'sent') {
        return;
      }
      if (invoice.status !== 'paid') {
        throw new ConflictException({
          code: 'NOT_PAID',
          message: "Cette facture n'est pas marquée payée",
        });
      }
      await tx.invoice.update({
        where: { id },
        data: {
          status: 'sent',
          paidOn: null,
          paymentMethod: null,
          paymentReference: null,
          paidRecordedById: null,
        },
      });
      await this.activity.record(
        tx,
        admin,
        'invoice.unpaid',
        { type: 'invoice', id },
        `a annulé le paiement de la facture ${invoice.number}`,
        {
          before: {
            paidOn: isoDay(invoice.paidOn),
            paymentMethod: invoice.paymentMethod,
            paymentReference: invoice.paymentReference,
            paidRecordedBy: invoice.paidRecordedBy?.fullName ?? null,
          },
          after: { status: 'sent' },
        },
      );
    });
    return this.get(id, admin);
  }

  // A full avoir, numbered in the same transaction; its PDF and delivery come after
  async cancel(
    id: string,
    { reason, channel }: CancelInvoiceDto,
    user: AuthUser,
  ): Promise<InvoiceCancelledDto> {
    // Before any number is taken: the avoir goes to the invoice's client
    await this.delivery.assertCanDeliver('invoice', id, channel);
    const today = todayInMorocco();

    const avoir = await this.prisma.$transaction(async (tx) => {
      await lockRow(tx, 'invoices', id);
      const invoice = await tx.invoice.findUniqueOrThrow({
        where: { id },
        include: { creditNote: { select: { number: true } } },
      });
      if (invoice.status === 'draft') {
        throw new ConflictException({
          code: 'NOT_SENT',
          message: "Un brouillon ne s'annule pas : supprimez-le",
        });
      }
      if (invoice.status === 'paid') {
        throw new ConflictException({
          code: 'INVOICE_PAID',
          message:
            "Cette facture est payée : elle ne peut plus être annulée. Si le paiement a été saisi par erreur, un administrateur peut d'abord l'annuler",
        });
      }
      if (invoice.status === 'cancelled') {
        throw new ConflictException({
          code: 'ALREADY_CANCELLED',
          message: `Cette facture est déjà annulée par l'avoir ${invoice.creditNote?.number ?? ''}`.trim(),
        });
      }

      const number = await this.numbering.next(tx, 'AV', Number(today.slice(0, 4)));
      // The invoice's copies and totals, the amounts made negative
      const note = await tx.creditNote.create({
        data: {
          number,
          invoiceId: id,
          reason,
          clientSnapshot: invoice.clientSnapshot as Prisma.InputJsonValue,
          shopSnapshot: invoice.shopSnapshot as Prisma.InputJsonValue,
          totalHtCentimes: -invoice.totalHtCentimes,
          totalTvaCentimes: -invoice.totalTvaCentimes,
          totalTtcCentimes: -invoice.totalTtcCentimes,
          totalInWords: invoice.totalInWords as string,
          sentVia: channel,
          createdById: user.id,
        },
      });
      await tx.invoice.update({ where: { id }, data: { status: 'cancelled' } });
      await this.activity.record(
        tx,
        user,
        'invoice.cancelled',
        { type: 'invoice', id },
        `a annulé la facture ${invoice.number} par l'avoir ${number} (motif : ${reason})`,
      );
      await this.activity.record(
        tx,
        user,
        'credit_note.created',
        { type: 'credit_note', id: note.id },
        `a envoyé l'avoir ${number} ${CHANNEL_WORDS[channel]}, qui annule la facture ${invoice.number}`,
      );
      return { id: note.id, number };
    });

    await this.files.ensureQuietly('credit_note', avoir.id);
    const delivery = await this.delivery.deliverAfterSend(
      'credit_note',
      avoir.id,
      channel,
      user,
      `Avoir ${avoir.number} créé`,
    );
    return {
      invoice: await this.get(id, user),
      creditNote: await this.creditNotes.get(avoir.id, user),
      delivery,
    };
  }
}

function toDto(row: ListRow, today: Date): InvoiceDto {
  const sentTo = row.clientSnapshot as unknown as ClientSnapshot | null;
  return {
    id: row.id,
    number: row.number,
    status: row.status,
    late: row.status === 'sent' && row.dueDate !== null && row.dueDate < today,
    client: { id: row.client.id, name: sentTo?.name ?? row.client.name },
    issueDate: isoDay(row.issueDate),
    dueDate: isoDay(row.dueDate),
    totalHtCentimes: row.totalHtCentimes,
    totalTvaCentimes: row.totalTvaCentimes,
    totalTtcCentimes: row.totalTtcCentimes,
    paidOn: isoDay(row.paidOn),
    paymentMethod: row.paymentMethod,
    sentVia: row.sentVia,
    sentAt: row.sentAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function assertDraft(invoice: Pick<Invoice, 'status'>) {
  if (invoice.status !== 'draft') {
    throw new ConflictException({
      code: 'NOT_DRAFT',
      message: 'Cette facture est envoyée : elle ne peut plus changer',
    });
  }
}

// A payment is recorded on a sent invoice, late or not
function assertOpen(invoice: Pick<Invoice, 'status'>) {
  if (invoice.status === 'draft') {
    throw notSentYet();
  }
  if (invoice.status === 'paid') {
    throw new ConflictException({
      code: 'ALREADY_PAID',
      message: 'Cette facture est déjà marquée payée',
    });
  }
  if (invoice.status === 'cancelled') {
    throw new ConflictException({
      code: 'INVOICE_CANCELLED',
      message: 'Cette facture est annulée',
    });
  }
}

function notSentYet() {
  return new ConflictException({
    code: 'NOT_SENT',
    message: "Envoyez d'abord cette facture",
  });
}

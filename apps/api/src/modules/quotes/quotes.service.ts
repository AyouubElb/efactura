import {
  addDays,
  formatDate,
  formatQuantity,
  formatRate,
  todayInMorocco,
} from '@efactura/shared';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { lockRow } from '../../common/prisma/lock-row.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { Page } from '../../common/response/page.js';
import {
  Prisma,
  type Quote,
  type QuoteLine,
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
  type DocumentTotals,
  type PreparedLine,
} from '../documents/document-lines.service.js';
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
import type {
  CreateQuoteDto,
  ExtendQuoteDto,
  QuoteDeliveredDto,
  QuoteDetailDto,
  QuoteDto,
  QuoteListQueryDto,
  UpdateQuoteDto,
} from './dto/quotes.dto.js';

const CHANNEL_WORDS: Record<SendChannel, string> = {
  whatsapp: 'par WhatsApp',
  email: 'par email',
  download: '(PDF téléchargé)',
};

const CLOSED_WORDS: Record<QuoteStatus, string> = {
  draft: 'un brouillon',
  sent: 'envoyé',
  accepted: 'accepté',
  refused: 'refusé',
  replaced: 'remplacé par une nouvelle version',
};

const LIST = {
  include: { client: { select: { id: true, name: true } } },
} satisfies Prisma.QuoteDefaultArgs;

const VERSION = {
  select: { id: true, number: true, version: true, status: true },
} satisfies Prisma.QuoteDefaultArgs;

const DETAIL = {
  include: {
    client: { select: { id: true, name: true } },
    lines: { orderBy: { position: 'asc' } },
    previousVersion: VERSION,
    nextVersion: VERSION,
    createdBy: { select: { id: true, fullName: true } },
    sentBy: { select: { id: true, fullName: true } },
  },
} satisfies Prisma.QuoteDefaultArgs;

type ListRow = Prisma.QuoteGetPayload<typeof LIST>;
type VersionRow = Prisma.QuoteGetPayload<typeof VERSION>;

@Injectable()
export class QuotesService {
  private readonly logger = new Logger(QuotesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
    private readonly settings: SettingsService,
    private readonly numbering: NumberingService,
    private readonly lines: DocumentLinesService,
    private readonly files: DocumentFilesService,
    private readonly shareLinks: ShareLinksService,
    private readonly delivery: DeliveryService,
  ) {}

  async list({
    page,
    pageSize,
    status,
    clientId,
  }: QuoteListQueryDto): Promise<Page<QuoteDto>> {
    const today = dayToDate(todayInMorocco());
    // "Expiré" is a question asked now, never a stored status
    const where: Prisma.QuoteWhereInput =
      status === 'expired'
        ? { clientId, status: 'sent', validUntil: { lt: today } }
        : status === 'sent'
          ? { clientId, status: 'sent', validUntil: { gte: today } }
          : { clientId, status };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.quote.findMany({
        ...LIST,
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.quote.count({ where }),
    ]);
    return new Page(
      rows.map((row) => toDto(row, today)),
      page,
      pageSize,
      total,
    );
  }

  async get(id: string, reader: AuthUser): Promise<QuoteDetailDto> {
    const row = await this.prisma.quote.findUniqueOrThrow({
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
      previousVersion: versionRef(row.previousVersion),
      nextVersion: versionRef(row.nextVersion),
      pdfReady: row.pdfKey !== null,
      shareLink:
        row.status === 'draft'
          ? null
          : await this.shareLinks.currentDto('quote', id),
      createdBy: row.createdBy,
      sentBy: row.sentBy,
      history: await this.activity.forEntity({ type: 'quote', id }, reader),
    });
  }

  async create(dto: CreateQuoteDto, user: AuthUser): Promise<QuoteDetailDto> {
    const client = await this.activeClient(dto.clientId);
    const { lines, totals } = await this.lines.prepare(dto.lines);
    const id = await this.prisma.$transaction(async (tx) => {
      const quote = await tx.quote.create({
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
        'quote.created',
        { type: 'quote', id: quote.id },
        `a créé un devis pour ${client.name} (brouillon)`,
      );
      return quote.id;
    });
    return this.get(id, user);
  }

  async update(
    id: string,
    dto: UpdateQuoteDto,
    user: AuthUser,
  ): Promise<QuoteDetailDto> {
    const current = await this.prisma.quote.findUniqueOrThrow({
      where: { id },
      include: { client: true, lines: true },
    });
    assertDraft(current);
    const newClient = dto.clientId !== undefined && dto.clientId !== current.clientId;
    if (newClient && current.previousVersionId) {
      throw invalid('clientId', 'Une nouvelle version garde le client du devis');
    }
    const client = newClient
      ? await this.activeClient(dto.clientId as string)
      : current.client;
    const prepared = dto.lines
      ? await this.lines.prepare(
          dto.lines,
          current.lines.flatMap((line) => (line.productId ? [line.productId] : [])),
        )
      : null;

    await this.prisma.$transaction(async (tx) => {
      await lockRow(tx, 'quotes', id);
      const before = await tx.quote.findUniqueOrThrow({
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
      await tx.quote.update({
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
        'quote.updated',
        { type: 'quote', id },
        `a modifié ${draftLabel(before, client.name)}`,
        changes(
          summary(before.client.name, beforeLines.length, before.totalTtcCentimes, before.notes),
          summary(client.name, afterLines.length, totalAfter, notes),
        ) ?? undefined,
      );
    });
    return this.get(id, user);
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await lockRow(tx, 'quotes', id);
      const quote = await tx.quote.findUniqueOrThrow({
        where: { id },
        include: { client: { select: { name: true } } },
      });
      assertDraft(quote);
      // A draft has no number yet: deleting it leaves no hole
      await tx.quote.delete({ where: { id } });
      await this.activity.record(
        tx,
        user,
        'quote.deleted',
        { type: 'quote', id },
        `a supprimé ${draftLabel(quote, quote.client.name)}`,
      );
    });
  }

  pdf(id: string): Promise<PdfFile> {
    return this.files.download('quote', id);
  }

  // One short transaction: number, copies, totals, history. The PDF and the delivery come after
  async send(
    id: string,
    channel: SendChannel,
    user: AuthUser,
  ): Promise<QuoteDeliveredDto> {
    const settings = await this.settings.current();
    if (!settings) {
      throw new ConflictException({
        code: 'SETTINGS_MISSING',
        message: "Remplissez d'abord les paramètres de la boutique",
      });
    }
    // Before any number is taken
    await this.delivery.assertCanDeliver('quote', id, channel);
    const today = todayInMorocco();

    await this.prisma.$transaction(async (tx) => {
      await lockRow(tx, 'quotes', id);
      const quote = await tx.quote.findUniqueOrThrow({
        where: { id },
        include: { client: true, lines: { orderBy: { position: 'asc' } } },
      });
      if (quote.status !== 'draft') {
        throw new ConflictException({
          code: 'NOT_DRAFT',
          message: 'Ce devis est déjà envoyé : pour le transmettre à nouveau, utilisez « Renvoyer »',
        });
      }
      const dropped = quote.lines.find(
        (line) => !settings.tvaRatesBp.includes(line.tvaRateBp),
      );
      if (dropped) {
        throw new ConflictException({
          code: 'TVA_RATE_REMOVED',
          message: `Le taux ${formatRate(dropped.tvaRateBp)} n'est plus proposé : modifiez la ligne ${dropped.position}`,
        });
      }

      const number = quote.previousVersionId
        ? await this.replacePrevious(tx, quote, user)
        : await this.numbering.next(tx, 'DV', Number(today.slice(0, 4)));
      const { totals } = documentTotals(quote.lines.map(storedLine));
      await tx.quote.update({
        where: { id },
        data: {
          status: 'sent',
          number,
          issueDate: dayToDate(today),
          validUntil: dayToDate(addDays(today, settings.defaultQuoteValidityDays)),
          clientSnapshot: json(clientSnapshot(quote.client)),
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
        'quote.sent',
        { type: 'quote', id },
        `a envoyé le devis ${displayNumber(number, quote.version)} ${CHANNEL_WORDS[channel]}`,
      );
    });

    await this.makePdf(id);
    const delivery = await this.afterNumber(id, () =>
      this.delivery.deliver('quote', id, channel, user),
    );
    return { quote: await this.get(id, user), delivery };
  }

  // The quote is numbered whatever fails now: the person is told to use "Renvoyer"
  private async afterNumber<T>(id: string, step: () => Promise<T>): Promise<T> {
    try {
      return await step();
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() !== 500) {
        throw error;
      }
      this.logger.error(`Delivery of quote ${id} failed`, error);
      const quote = await this.prisma.quote.findUniqueOrThrow({ where: { id } });
      throw new ServiceUnavailableException({
        code: 'DELIVERY_FAILED',
        message: `Devis ${displayNumber(quote.number, quote.version)} envoyé, mais la livraison a échoué : utilisez « Renvoyer »`,
      });
    }
  }

  // Delivering again never touches the number
  async deliver(
    id: string,
    channel: SendChannel,
    user: AuthUser,
  ): Promise<QuoteDeliveredDto> {
    const quote = await this.prisma.quote.findUniqueOrThrow({ where: { id } });
    if (quote.status === 'draft') {
      throw notSentYet();
    }
    const delivery = await this.delivery.deliver('quote', id, channel, user);
    await this.activity.record(
      this.prisma,
      user,
      'quote.delivered',
      { type: 'quote', id },
      `a renvoyé le devis ${displayNumber(quote.number, quote.version)} ${CHANNEL_WORDS[channel]}`,
    );
    return { quote: await this.get(id, user), delivery };
  }

  accept(id: string, user: AuthUser): Promise<QuoteDetailDto> {
    return this.decide(id, 'accepted', user);
  }

  refuse(id: string, user: AuthUser): Promise<QuoteDetailDto> {
    return this.decide(id, 'refused', user);
  }

  // A new draft with the same number; this version stays valid until the new one is sent
  async revise(id: string, user: AuthUser): Promise<QuoteDetailDto> {
    const nextId = await this.prisma.$transaction(async (tx) => {
      await lockRow(tx, 'quotes', id);
      const quote = await tx.quote.findUniqueOrThrow({
        where: { id },
        include: {
          lines: { orderBy: { position: 'asc' } },
          nextVersion: { select: { version: true } },
        },
      });
      if (quote.status === 'draft') {
        throw new ConflictException({
          code: 'NOT_SENT',
          message: 'Un brouillon se modifie directement',
        });
      }
      assertOpen(quote);
      if (quote.nextVersion) {
        throw new ConflictException({
          code: 'REVISION_EXISTS',
          message: `La version ${quote.nextVersion.version} est déjà en brouillon`,
        });
      }
      const lines = quote.lines.map(storedLine);
      const next = await tx.quote.create({
        data: {
          number: quote.number,
          version: quote.version + 1,
          previousVersionId: quote.id,
          clientId: quote.clientId,
          notes: quote.notes,
          createdById: user.id,
          ...totalsData(documentTotals(lines).totals),
          lines: { create: lines },
        },
      });
      await this.activity.record(
        tx,
        user,
        'quote.revised',
        { type: 'quote', id: next.id },
        `a préparé la version ${next.version} du devis ${quote.number}`,
      );
      return next.id;
    });
    return this.get(nextId, user);
  }

  async extend(
    id: string,
    { validUntil }: ExtendQuoteDto,
    user: AuthUser,
  ): Promise<QuoteDetailDto> {
    if (!isDay(validUntil)) {
      throw invalid('validUntil', 'Date invalide');
    }
    if (validUntil <= todayInMorocco()) {
      throw invalid('validUntil', "Choisissez une date après aujourd'hui");
    }
    await this.prisma.$transaction(async (tx) => {
      await lockRow(tx, 'quotes', id);
      const quote = await tx.quote.findUniqueOrThrow({ where: { id } });
      assertOpen(quote);
      const before = isoDay(quote.validUntil);
      if (before === validUntil) {
        return;
      }
      // The kept PDF prints the old date: a new one is made, the old file stays in storage
      await tx.quote.update({
        where: { id },
        data: { validUntil: dayToDate(validUntil), pdfKey: null },
      });
      await this.activity.record(
        tx,
        user,
        'quote.extended',
        { type: 'quote', id },
        `a prolongé le devis ${displayNumber(quote.number, quote.version)} jusqu'au ${formatDate(validUntil)}`,
        {
          before: { validUntil: before, pdfKey: quote.pdfKey },
          after: { validUntil },
        },
      );
    });
    await this.makePdf(id);
    return this.get(id, user);
  }

  // After the commit: a PDF that fails here is made at its first need
  private async makePdf(id: string) {
    try {
      await this.files.ensure('quote', id);
    } catch (error) {
      this.logger.warn(
        `PDF of quote ${id} not made yet: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async decide(
    id: string,
    status: 'accepted' | 'refused',
    user: AuthUser,
  ): Promise<QuoteDetailDto> {
    await this.prisma.$transaction(async (tx) => {
      await lockRow(tx, 'quotes', id);
      const quote = await tx.quote.findUniqueOrThrow({ where: { id } });
      if (quote.status === status) {
        return;
      }
      assertOpen(quote);
      await tx.quote.update({ where: { id }, data: { status } });
      await this.activity.record(
        tx,
        user,
        `quote.${status}`,
        { type: 'quote', id },
        `a marqué le devis ${displayNumber(quote.number, quote.version)} ${CLOSED_WORDS[status]}`,
      );
    });
    return this.get(id, user);
  }

  // A revision keeps the number; the version it replaces must still be open
  private async replacePrevious(
    tx: Prisma.TransactionClient,
    quote: Quote,
    user: AuthUser,
  ): Promise<string> {
    const previousId = quote.previousVersionId as string;
    await lockRow(tx, 'quotes', previousId);
    const previous = await tx.quote.findUniqueOrThrow({
      where: { id: previousId },
    });
    const previousNumber = displayNumber(previous.number, previous.version);
    if (previous.status !== 'sent') {
      throw new ConflictException({
        code: 'PREVIOUS_VERSION_CLOSED',
        message: `Le devis ${previousNumber} est ${CLOSED_WORDS[previous.status]} : supprimez ce brouillon`,
      });
    }
    await tx.quote.update({
      where: { id: previousId },
      data: { status: 'replaced' },
    });
    await this.activity.record(
      tx,
      user,
      'quote.replaced',
      { type: 'quote', id: previousId },
      `a remplacé le devis ${previousNumber} par la version ${quote.version}`,
    );
    return quote.number as string;
  }

  private async activeClient(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });
    if (!client || client.archivedAt) {
      throw invalid('clientId', client ? 'Client archivé' : 'Client introuvable');
    }
    return client;
  }
}

function toDto(row: ListRow, today: Date): QuoteDto {
  const sentTo = row.clientSnapshot as unknown as ClientSnapshot | null;
  return {
    id: row.id,
    number: displayNumber(row.number, row.version),
    version: row.version,
    status: row.status,
    expired:
      row.status === 'sent' &&
      row.validUntil !== null &&
      row.validUntil < today,
    client: { id: row.client.id, name: sentTo?.name ?? row.client.name },
    issueDate: isoDay(row.issueDate),
    validUntil: isoDay(row.validUntil),
    totalHtCentimes: row.totalHtCentimes,
    totalTvaCentimes: row.totalTvaCentimes,
    totalTtcCentimes: row.totalTtcCentimes,
    sentVia: row.sentVia,
    sentAt: row.sentAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function storedLine(line: QuoteLine): PreparedLine {
  return {
    position: line.position,
    productId: line.productId,
    label: line.label,
    reference: line.reference,
    unit: line.unit,
    quantity: line.quantity.toString(),
    unitPriceHtCentimes: line.unitPriceHtCentimes,
    tvaRateBp: line.tvaRateBp,
    lineTotalHtCentimes: line.lineTotalHtCentimes,
  };
}

function sameLines(before: PreparedLine[], after: PreparedLine[]): boolean {
  const comparable = (lines: PreparedLine[]) =>
    JSON.stringify(
      lines.map((line) => ({ ...line, quantity: formatQuantity(line.quantity) })),
    );
  return comparable(before) === comparable(after);
}

function versionRef(row: VersionRow | null) {
  return row
    ? { id: row.id, number: displayNumber(row.number, row.version), status: row.status }
    : null;
}

function totalsData(totals: DocumentTotals) {
  return {
    totalHtCentimes: totals.totalHtCentimes,
    totalTvaCentimes: totals.totalTvaCentimes,
    totalTtcCentimes: totals.totalTtcCentimes,
    tvaBreakdown: json(totals.tvaBreakdown),
    totalInWords: totals.totalInWords,
  };
}

function json(value: object): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

// What the history keeps of a draft: who it is for, how many lines, how much
function summary(
  client: string,
  lines: number,
  totalTtcCentimes: number,
  notes: string | null,
) {
  return { client, lines, totalTtcCentimes, notes };
}

function draftLabel(quote: Pick<Quote, 'number' | 'version'>, client: string) {
  return quote.number
    ? `le brouillon du devis ${displayNumber(quote.number, quote.version)}`
    : `le brouillon de devis pour ${client}`;
}

function assertDraft(quote: Pick<Quote, 'status'>) {
  if (quote.status !== 'draft') {
    throw new ConflictException({
      code: 'NOT_DRAFT',
      message: 'Ce devis est envoyé : il ne peut plus changer',
    });
  }
}

// Accept, refuse, revise and extend work on a sent quote, expired or not
function assertOpen(quote: Pick<Quote, 'status'>) {
  if (quote.status === 'draft') {
    throw notSentYet();
  }
  if (quote.status !== 'sent') {
    throw new ConflictException({
      code: 'QUOTE_CLOSED',
      message: `Ce devis est ${CLOSED_WORDS[quote.status]}`,
    });
  }
}

function notSentYet() {
  return new ConflictException({
    code: 'NOT_SENT',
    message: "Envoyez d'abord ce devis",
  });
}

function invalid(field: string, message: string) {
  return new BadRequestException({
    code: 'VALIDATION_FAILED',
    message: 'Données invalides',
    fields: { [field]: message },
  });
}

function isDay(day: string): boolean {
  try {
    formatDate(day);
    return true;
  } catch {
    return false;
  }
}

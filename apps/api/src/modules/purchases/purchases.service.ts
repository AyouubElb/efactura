import { randomUUID } from 'node:crypto';
import { formatDate, todayInMorocco } from '@efactura/shared';
import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { lockRow } from '../../common/prisma/lock-row.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { isUniqueViolation } from '../../common/prisma/unique-violation.js';
import { Page } from '../../common/response/page.js';
import type {
  Prisma,
  PurchaseInvoice,
  PurchaseStatus,
} from '../../generated/prisma/client.js';
import { ActivityService } from '../activity/activity.service.js';
import { json } from '../documents/drafts.js';
import { StorageService } from '../storage/storage.service.js';
import { ConfirmService } from './confirm.service.js';
import type { PurchaseDraft } from './draft.js';
import {
  MAX_FILE_BYTES,
  type PurchaseDetailDto,
  type PurchaseDto,
  type PurchaseListQueryDto,
  type PurchaseUploadDto,
  type PurchaseUploadLinkDto,
  type RegisterPurchaseDto,
} from './dto/purchases.dto.js';
import type { ReviewDraftDto, ReviewSavedDto } from './dto/review-draft.dto.js';
import { notEditable } from './editable.js';
import type { FileType } from './invoice-reader.js';
import { PurchasesQueue } from './purchases.queue.js';

const EXTENSIONS: Record<FileType, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

// A worker that died mid-read leaves the row "reading": after this, it shows as failed
const STUCK_AFTER_MS = 10 * 60_000;
const STUCK_MESSAGE = "La lecture n'a pas abouti : utilisez « Relancer »";

const LIST = {
  include: { uploadedBy: { select: { id: true, fullName: true } } },
} as const;

type Row = Prisma.PurchaseInvoiceGetPayload<typeof LIST>;

@Injectable()
export class PurchasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly activity: ActivityService,
    private readonly queue: PurchasesQueue,
    private readonly confirming: ConfirmService,
  ) {}

  // The same file is refused before it is uploaded, so before any AI cost
  async uploadLink({
    fileType,
    fileSize,
    sha256,
  }: PurchaseUploadDto): Promise<PurchaseUploadLinkDto> {
    await this.assertNew(sha256);
    const fileKey = `purchases/${randomUUID()}.${EXTENSIONS[fileType]}`;
    return {
      uploadUrl: await this.storage.linkToUpload(fileKey, fileType, fileSize),
      fileKey,
    };
  }

  async register(
    { fileKey, sha256 }: RegisterPurchaseDto,
    user: AuthUser,
  ): Promise<PurchaseDetailDto> {
    const stored = await this.storage.check(fileKey);
    if (!stored) {
      throw new ConflictException({
        code: 'FILE_NOT_RECEIVED',
        message: "Le fichier n'a pas été reçu : envoyez-le puis réessayez",
      });
    }
    const fileType = typeOfKey(fileKey);
    if (stored.size > MAX_FILE_BYTES || stored.type !== fileType) {
      throw new ConflictException({
        code: 'FILE_REFUSED',
        message: 'Fichier refusé : un PDF, JPEG, PNG ou WebP de 10 Mo au maximum',
      });
    }
    await this.assertNew(sha256);
    let id: string;
    try {
      id = await this.prisma.$transaction(async (tx) => {
        const row = await tx.purchaseInvoice.create({
          data: {
            fileKey,
            fileType,
            fileSize: stored.size,
            fileSha256: sha256,
            uploadedById: user.id,
          },
        });
        await this.activity.record(
          tx,
          user,
          'purchase.uploaded',
          { type: 'purchase_invoice', id: row.id },
          `a importé une facture fournisseur, ${fileType === 'application/pdf' ? 'un PDF' : 'une photo'}`,
        );
        return row.id;
      });
    } catch (error) {
      // Two uploads of one file at the same moment: the index keeps one
      if (isUniqueViolation(error)) {
        await this.assertNew(sha256);
      }
      throw error;
    }
    await this.startReading(id, 'uploaded');
    return this.get(id, user);
  }

  async list({
    page,
    pageSize,
    status,
  }: PurchaseListQueryDto): Promise<Page<PurchaseDto>> {
    const where: Prisma.PurchaseInvoiceWhereInput = { status };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.purchaseInvoice.findMany({
        ...LIST,
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.purchaseInvoice.count({ where }),
    ]);
    return new Page(rows.map(toDto), page, pageSize, total);
  }

  async get(id: string, reader: AuthUser): Promise<PurchaseDetailDto> {
    const row = await this.prisma.purchaseInvoice.findUniqueOrThrow({
      ...LIST,
      where: { id },
    });
    const stuck = isStuck(row);
    return {
      ...toDto(row),
      pageCount: row.pageCount,
      error: stuck ? STUCK_MESSAGE : row.error,
      attempts: row.attempts,
      aiModel: row.aiModel,
      aiCostMicroUsd: row.aiCostMicroUsd,
      proposal: row.proposal as object | null,
      draft: row.reviewDraft as PurchaseDraft | null,
      history: await this.activity.forEntity(
        { type: 'purchase_invoice', id },
        reader,
      ),
    };
  }

  async fileLink(id: string): Promise<{ url: string }> {
    const row = await this.prisma.purchaseInvoice.findUniqueOrThrow({
      where: { id },
      select: { fileKey: true },
    });
    return { url: await this.storage.linkToRead(row.fileKey) };
  }

  // Replaced whole at each save, so the last save wins; no history line until "Valider"
  async saveReview(id: string, draft: ReviewDraftDto): Promise<ReviewSavedDto> {
    const updatedAt = new Date();
    const { count } = await this.prisma.purchaseInvoice.updateMany({
      where: { id, status: 'ready' },
      data: { reviewDraft: json(draft), updatedAt },
    });
    if (count === 0) {
      const { status } = await this.prisma.purchaseInvoice.findUniqueOrThrow({
        where: { id },
        select: { status: true },
      });
      throw notEditable(status);
    }
    return { updatedAt };
  }

  // Validates the last saved brouillon: the screen saves before it calls this
  async confirm(id: string, user: AuthUser): Promise<PurchaseDetailDto> {
    await this.confirming.confirm(id, user);
    return this.get(id, user);
  }

  // "Relancer": a failed read, one never queued, or one stuck after a restart
  async retry(id: string, user: AuthUser): Promise<PurchaseDetailDto> {
    const row = await this.prisma.purchaseInvoice.findUniqueOrThrow({
      where: { id },
    });
    if (!(row.status === 'failed' || row.status === 'uploaded' || isStuck(row))) {
      throw new ConflictException({
        code: 'NOT_FAILED',
        message:
          row.status === 'reading'
            ? 'Lecture en cours : attendez son résultat'
            : "Cette facture n'est pas en échec",
      });
    }
    await this.startReading(id, row.status, (tx) =>
      this.activity.record(
        tx,
        user,
        'purchase.retried',
        { type: 'purchase_invoice', id },
        'a relancé la lecture',
      ),
    );
    return this.get(id, user);
  }

  async discard(id: string, user: AuthUser): Promise<PurchaseDetailDto> {
    await this.prisma.$transaction(async (tx) => {
      await lockRow(tx, 'purchase_invoices', id);
      const row = await tx.purchaseInvoice.findUniqueOrThrow({ where: { id } });
      if (row.status === 'discarded') {
        return;
      }
      if (row.status === 'confirmed') {
        throw new ConflictException({
          code: 'ALREADY_CONFIRMED',
          message: 'Achat déjà validé : il ne peut plus être écarté',
        });
      }
      await tx.purchaseInvoice.update({
        where: { id },
        data: { status: 'discarded' },
      });
      const number = (row.reviewDraft as PurchaseDraft | null)?.invoiceNumber;
      await this.activity.record(
        tx,
        user,
        'purchase.discarded',
        { type: 'purchase_invoice', id },
        number
          ? `a écarté la facture fournisseur ${number}`
          : 'a écarté la facture fournisseur',
      );
    });
    return this.get(id, user);
  }

  // Marked first so the worker finds it waiting; put back if the queue can't be reached
  private async startReading(
    id: string,
    from: PurchaseStatus,
    record?: (tx: Prisma.TransactionClient) => Promise<unknown>,
  ) {
    const started = await this.prisma.$transaction(async (tx) => {
      // A second click finds the first one's change and stops here
      const { count } = await tx.purchaseInvoice.updateMany({
        where:
          from === 'reading'
            ? { id, status: 'reading', updatedAt: { lt: new Date(Date.now() - STUCK_AFTER_MS) } }
            : { id, status: from },
        data: { status: 'reading', error: null, attempts: 0 },
      });
      if (count > 0) {
        await record?.(tx);
      }
      return count > 0;
    });
    if (!started) {
      return;
    }
    try {
      await this.queue.read(id);
    } catch {
      await this.prisma.purchaseInvoice.updateMany({
        where: { id, status: 'reading' },
        data: {
          status: from === 'uploaded' ? 'uploaded' : 'failed',
          error: "La lecture n'a pas pu démarrer : utilisez « Relancer »",
        },
      });
      throw new ServiceUnavailableException({
        code: 'READ_NOT_QUEUED',
        message: "Facture enregistrée, mais la lecture n'a pas pu démarrer : utilisez « Relancer »",
      });
    }
  }

  // A discarded upload never blocks the same file
  private async assertNew(sha256: string) {
    const existing = await this.prisma.purchaseInvoice.findFirst({
      where: { fileSha256: sha256, status: { not: 'discarded' } },
      select: { id: true, createdAt: true },
    });
    if (existing) {
      throw new ConflictException({
        code: 'ALREADY_IMPORTED',
        message: `Déjà importée le ${formatDate(todayInMorocco(existing.createdAt))}`,
        purchaseId: existing.id,
      });
    }
  }
}

function typeOfKey(fileKey: string): FileType {
  const extension = fileKey.slice(fileKey.lastIndexOf('.') + 1);
  const type = (Object.keys(EXTENSIONS) as FileType[]).find(
    (known) => EXTENSIONS[known] === extension,
  );
  if (!type) {
    throw new ConflictException({
      code: 'FILE_REFUSED',
      message: 'Fichier refusé : un PDF, JPEG, PNG ou WebP',
    });
  }
  return type;
}

function isStuck(row: PurchaseInvoice): boolean {
  return (
    row.status === 'reading' &&
    Date.now() - row.updatedAt.getTime() > STUCK_AFTER_MS
  );
}

function toDto(row: Row): Pick<PurchaseDto, keyof PurchaseDto> {
  const draft = row.reviewDraft as PurchaseDraft | null;
  const confirmed = row.status === 'confirmed';
  return {
    id: row.id,
    status: isStuck(row) ? 'failed' : row.status,
    fileType: row.fileType,
    supplierName: draft?.supplier.name ?? null,
    invoiceNumber: confirmed
      ? row.supplierInvoiceNumber
      : (draft?.invoiceNumber ?? null),
    invoiceDate: draft?.invoiceDate ?? null,
    totalTtcCentimes: confirmed
      ? row.totalTtcCentimes
      : (draft?.totals.ttcCentimes ?? null),
    uploadedBy: row.uploadedBy,
    createdAt: row.createdAt,
  };
}

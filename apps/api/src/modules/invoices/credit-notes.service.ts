import { todayInMorocco, type TvaBreakdownRow } from '@efactura/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type { SendChannel } from '../../generated/prisma/client.js';
import { ActivityService } from '../activity/activity.service.js';
import { minusBreakdown, minusLine } from '../documents/avoir.js';
import { DeliveryService } from '../documents/delivery.service.js';
import {
  DocumentFilesService,
  type PdfFile,
} from '../documents/document-files.service.js';
import { CHANNEL_WORDS, storedLine } from '../documents/drafts.js';
import { ShareLinksService } from '../documents/share-links.service.js';
import type {
  ClientSnapshot,
  ShopSnapshot,
} from '../documents/snapshots.js';
import type {
  CreditNoteDeliveredDto,
  CreditNoteDetailDto,
} from './dto/credit-notes.dto.js';

// An avoir is made by cancelling an invoice; here it is read, printed and delivered again
@Injectable()
export class CreditNotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
    private readonly files: DocumentFilesService,
    private readonly shareLinks: ShareLinksService,
    private readonly delivery: DeliveryService,
  ) {}

  async get(id: string, reader: AuthUser): Promise<CreditNoteDetailDto> {
    const row = await this.prisma.creditNote.findUniqueOrThrow({
      where: { id },
      include: {
        invoice: {
          select: {
            id: true,
            number: true,
            clientId: true,
            tvaBreakdown: true,
            lines: { orderBy: { position: 'asc' } },
          },
        },
        createdBy: { select: { id: true, fullName: true } },
      },
    });
    const clientSnapshot = row.clientSnapshot as unknown as ClientSnapshot;
    return {
      id: row.id,
      number: row.number,
      invoice: { id: row.invoice.id, number: row.invoice.number as string },
      client: { id: row.invoice.clientId, name: clientSnapshot.name },
      reason: row.reason,
      issueDate: todayInMorocco(row.createdAt),
      totalHtCentimes: row.totalHtCentimes,
      totalTvaCentimes: row.totalTvaCentimes,
      totalTtcCentimes: row.totalTtcCentimes,
      totalInWords: row.totalInWords,
      lines: row.invoice.lines.map((line) => minusLine(storedLine(line))),
      tvaBreakdown: minusBreakdown(
        (row.invoice.tvaBreakdown ?? []) as unknown as TvaBreakdownRow[],
      ),
      clientSnapshot,
      shopSnapshot: row.shopSnapshot as unknown as ShopSnapshot,
      sentVia: row.sentVia,
      pdfReady: row.pdfKey !== null,
      shareLink: await this.shareLinks.currentDto('credit_note', id),
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      history: await this.activity.forEntity({ type: 'credit_note', id }, reader),
    };
  }

  pdf(id: string): Promise<PdfFile> {
    return this.files.download('credit_note', id);
  }

  async deliver(
    id: string,
    channel: SendChannel,
    user: AuthUser,
  ): Promise<CreditNoteDeliveredDto> {
    const note = await this.prisma.creditNote.findUniqueOrThrow({ where: { id } });
    const delivery = await this.delivery.deliver('credit_note', id, channel, user);
    await this.activity.record(
      this.prisma,
      user,
      'credit_note.delivered',
      { type: 'credit_note', id },
      `a renvoyé l'avoir ${note.number} ${CHANNEL_WORDS[channel]}`,
    );
    return { creditNote: await this.get(id, user), delivery };
  }
}

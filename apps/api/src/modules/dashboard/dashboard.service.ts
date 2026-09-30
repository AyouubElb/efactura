import { todayInMorocco } from '@efactura/shared';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { dayToDate, displayNumber } from '../documents/numbers.js';
import type { ClientSnapshot } from '../documents/snapshots.js';
import type {
  AmountDto,
  DashboardTotalsDto,
  RecentDocumentDto,
} from './dto/dashboard.dto.js';

const RECENT = 10;

const TTC = { _sum: { totalTtcCentimes: true }, _count: true } as const;

const CLIENT_NAME = { client: { select: { name: true } } } as const;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // The month and "today" are Morocco's: the server runs on UTC
  async totals(): Promise<DashboardTotalsDto> {
    const today = todayInMorocco();
    const month = today.slice(0, 7);
    const thisMonth = {
      gte: dayToDate(`${month}-01`),
      lt: dayToDate(firstOfNextMonth(month)),
    };
    const [collected, waiting, late, purchases] = await this.prisma.$transaction([
      this.prisma.invoice.aggregate({
        where: { status: 'paid', paidOn: thisMonth },
        ...TTC,
      }),
      this.prisma.invoice.aggregate({
        where: { status: 'sent', dueDate: { gte: dayToDate(today) } },
        ...TTC,
      }),
      this.prisma.invoice.aggregate({
        where: { status: 'sent', dueDate: { lt: dayToDate(today) } },
        ...TTC,
      }),
      this.prisma.purchaseInvoice.aggregate({
        where: { status: 'confirmed', invoiceDate: thisMonth },
        ...TTC,
      }),
    ]);
    return {
      month,
      collectedThisMonth: amount(collected),
      waiting: amount(waiting),
      late: amount(late),
      purchasesThisMonth: amount(purchases),
    };
  }

  // The latest changes across quotes, invoices and avoirs
  async recent(): Promise<RecentDocumentDto[]> {
    const today = dayToDate(todayInMorocco());
    const latest = { orderBy: [{ updatedAt: 'desc' as const }, { id: 'asc' as const }], take: RECENT };
    const [quotes, invoices, notes] = await this.prisma.$transaction([
      this.prisma.quote.findMany({ ...latest, include: CLIENT_NAME }),
      this.prisma.invoice.findMany({ ...latest, include: CLIENT_NAME }),
      this.prisma.creditNote.findMany({
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: RECENT,
      }),
    ]);
    const rows: RecentDocumentDto[] = [
      ...quotes.map((quote): RecentDocumentDto => ({
        type: 'quote',
        id: quote.id,
        number: displayNumber(quote.number, quote.version),
        status:
          quote.status === 'sent' && quote.validUntil && quote.validUntil < today
            ? 'expired'
            : quote.status,
        client: sentName(quote.clientSnapshot) ?? quote.client.name,
        totalTtcCentimes: quote.totalTtcCentimes,
        changedAt: quote.updatedAt,
      })),
      ...invoices.map((invoice): RecentDocumentDto => ({
        type: 'invoice',
        id: invoice.id,
        number: invoice.number,
        status:
          invoice.status === 'sent' && invoice.dueDate && invoice.dueDate < today
            ? 'late'
            : invoice.status,
        client: sentName(invoice.clientSnapshot) ?? invoice.client.name,
        totalTtcCentimes: invoice.totalTtcCentimes,
        changedAt: invoice.updatedAt,
      })),
      ...notes.map((note): RecentDocumentDto => ({
        type: 'credit_note',
        id: note.id,
        number: note.number,
        status: 'issued',
        client: sentName(note.clientSnapshot) as string,
        totalTtcCentimes: note.totalTtcCentimes,
        changedAt: note.createdAt,
      })),
    ];
    return rows
      .sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime())
      .slice(0, RECENT);
  }
}

function amount(result: {
  _sum: { totalTtcCentimes: number | null };
  _count: number;
}): AmountDto {
  return {
    totalTtcCentimes: result._sum.totalTtcCentimes ?? 0,
    count: result._count,
  };
}

// A sent document shows the client's name as it was sent
function sentName(snapshot: Prisma.JsonValue): string | null {
  return (snapshot as unknown as ClientSnapshot | null)?.name ?? null;
}

// "2026-12" → "2027-01-01"
function firstOfNextMonth(month: string): string {
  const [year, number] = month.split('-').map(Number);
  return number === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(number + 1).padStart(2, '0')}-01`;
}

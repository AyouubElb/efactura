import { formatDate, formatQuantity, formatRate } from '@efactura/shared';
import { BadRequestException, ConflictException } from '@nestjs/common';
import type { PrismaService } from '../../common/prisma/prisma.service.js';
import type {
  Prisma,
  QuoteLine,
  SendChannel,
} from '../../generated/prisma/client.js';
import type {
  DocumentTotals,
  PreparedLine,
} from './document-lines.service.js';

// What quote and invoice drafts share: their lines, totals and history summaries

export const CHANNEL_WORDS: Record<SendChannel, string> = {
  whatsapp: 'par WhatsApp',
  email: 'par email',
  download: '(PDF téléchargé)',
};

// Quote and invoice lines have the same columns
type LineRow = Pick<
  QuoteLine,
  | 'position'
  | 'productId'
  | 'label'
  | 'reference'
  | 'unit'
  | 'quantity'
  | 'unitPriceHtCentimes'
  | 'tvaRateBp'
  | 'lineTotalHtCentimes'
>;

export function storedLine(line: LineRow): PreparedLine {
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

export function sameLines(before: PreparedLine[], after: PreparedLine[]): boolean {
  const comparable = (lines: PreparedLine[]) =>
    JSON.stringify(
      lines.map((line) => ({ ...line, quantity: formatQuantity(line.quantity) })),
    );
  return comparable(before) === comparable(after);
}

export function totalsData(totals: DocumentTotals) {
  return {
    totalHtCentimes: totals.totalHtCentimes,
    totalTvaCentimes: totals.totalTvaCentimes,
    totalTtcCentimes: totals.totalTtcCentimes,
    tvaBreakdown: json(totals.tvaBreakdown),
    totalInWords: totals.totalInWords,
  };
}

export function json(value: object): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

// What the history keeps of a draft: who it is for, how many lines, how much
export function draftSummary(
  client: string,
  lines: number,
  totalTtcCentimes: number,
  notes: string | null,
) {
  return { client, lines, totalTtcCentimes, notes };
}

// A rate removed from the settings since the draft was written
export function assertRatesOffered(
  lines: Pick<QuoteLine, 'position' | 'tvaRateBp'>[],
  ratesBp: number[],
) {
  const dropped = lines.find((line) => !ratesBp.includes(line.tvaRateBp));
  if (dropped) {
    throw new ConflictException({
      code: 'TVA_RATE_REMOVED',
      message: `Le taux ${formatRate(dropped.tvaRateBp)} n'est plus proposé : modifiez la ligne ${dropped.position}`,
    });
  }
}

export async function activeClient(prisma: PrismaService, clientId: string) {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client || client.archivedAt) {
    throw invalid('clientId', client ? 'Client archivé' : 'Client introuvable');
  }
  return client;
}

export function settingsMissing() {
  return new ConflictException({
    code: 'SETTINGS_MISSING',
    message: "Remplissez d'abord les paramètres de la boutique",
  });
}

export function invalid(field: string, message: string) {
  return new BadRequestException({
    code: 'VALIDATION_FAILED',
    message: 'Données invalides',
    fields: { [field]: message },
  });
}

export function isDay(day: string): boolean {
  try {
    formatDate(day);
    return true;
  } catch {
    return false;
  }
}

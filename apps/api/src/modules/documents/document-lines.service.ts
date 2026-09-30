import {
  amountInWords,
  computeTotals,
  type TvaBreakdownRow,
} from '@efactura/shared';
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';
import type { DocumentLineDto } from './dto/document-line.dto.js';

const DEFAULT_UNIT = 'pièce';

export interface PreparedLine {
  position: number;
  productId: string | null;
  label: string;
  reference: string | null;
  unit: string;
  quantity: string;
  unitPriceHtCentimes: number;
  tvaRateBp: number;
  lineTotalHtCentimes: number;
}

export interface DocumentTotals {
  totalHtCentimes: number;
  totalTvaCentimes: number;
  totalTtcCentimes: number;
  tvaBreakdown: TvaBreakdownRow[];
  totalInWords: string;
}

type LineAmounts = Pick<
  PreparedLine,
  'quantity' | 'unitPriceHtCentimes' | 'tvaRateBp'
>;

// The same function as the screen's live preview: both always agree
export function documentTotals(lines: LineAmounts[]): {
  lineTotals: number[];
  totals: DocumentTotals;
} {
  try {
    const result = computeTotals(lines);
    return {
      lineTotals: result.lineTotalsHtCentimes,
      totals: {
        totalHtCentimes: result.totalHtCentimes,
        totalTvaCentimes: result.totalTvaCentimes,
        totalTtcCentimes: result.totalTtcCentimes,
        tvaBreakdown: result.tvaBreakdown,
        totalInWords: amountInWords(result.totalTtcCentimes),
      },
    };
  } catch (error) {
    // The lines passed validation: only an amount past the database's limit is left
    if (error instanceof RangeError) {
      throw new BadRequestException({
        code: 'AMOUNT_TOO_LARGE',
        message:
          'Montant trop élevé : un document ne peut pas dépasser 21 474 836,47 DH',
      });
    }
    throw error;
  }
}

@Injectable()
export class DocumentLinesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  // Catalogue lines copy their product; products already on the draft may be archived since
  async prepare(
    lines: DocumentLineDto[],
    productsAlreadyOnIt: readonly string[] = [],
  ): Promise<{ lines: PreparedLine[]; totals: DocumentTotals }> {
    const { tvaRatesBp } = await this.settings.get();
    const ids = [
      ...new Set(lines.flatMap((line) => (line.productId ? [line.productId] : []))),
    ];
    const products = new Map(
      (
        await this.prisma.product.findMany({
          where: { id: { in: ids } },
          select: { id: true, reference: true, unit: true, archivedAt: true },
        })
      ).map((product) => [product.id, product]),
    );

    const fields: Record<string, string> = {};
    lines.forEach((line, index) => {
      const product = line.productId ? products.get(line.productId) : undefined;
      if (line.productId && !product) {
        fields[`lines.${index}.productId`] = 'Produit introuvable';
      } else if (
        product?.archivedAt &&
        !productsAlreadyOnIt.includes(product.id)
      ) {
        fields[`lines.${index}.productId`] = 'Produit archivé';
      }
      if (!tvaRatesBp.includes(line.tvaRateBp)) {
        fields[`lines.${index}.tvaRateBp`] =
          'Taux de TVA non proposé dans les paramètres';
      }
    });
    if (Object.keys(fields).length > 0) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'Données invalides',
        fields,
      });
    }

    const { lineTotals, totals } = documentTotals(lines);
    return {
      lines: lines.map((line, index) => {
        const product = line.productId ? products.get(line.productId) : undefined;
        return {
          position: index + 1,
          productId: line.productId ?? null,
          label: line.label,
          reference: product?.reference ?? null,
          unit: line.unit ?? product?.unit ?? DEFAULT_UNIT,
          quantity: line.quantity,
          unitPriceHtCentimes: line.unitPriceHtCentimes,
          tvaRateBp: line.tvaRateBp,
          lineTotalHtCentimes: lineTotals[index],
        };
      }),
      totals,
    };
  }
}

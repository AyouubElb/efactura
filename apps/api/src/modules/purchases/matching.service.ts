import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { searchText } from '../../common/prisma/search.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { Candidate, LineMatch } from './draft.js';

// A product at least this alike is suggested; from the second bar it is chosen in advance
const SUGGEST_FROM = 0.3;
const CHOOSE_FROM = 0.45;

interface LineToMatch {
  label: string | null;
  reference: string | null;
}

// "HP 250G10 I5-1335U 8/512 W11" → "hp 250g10 i5 1335u 8 512 w11"
export function labelKey(label: string): string {
  return label
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

@Injectable()
export class MatchingService {
  constructor(private readonly prisma: PrismaService) {}

  // A saved name, then the same reference: both are sure. Only the other lines look for close names
  async match(supplierId: string | null, lines: LineToMatch[]): Promise<LineMatch[]> {
    const savedNames = await this.savedNames(supplierId, lines);
    const references = await this.references(lines);
    const matches = lines.map((line): LineMatch => {
      const bySavedName = line.label ? savedNames.get(labelKey(line.label)) : undefined;
      if (bySavedName) {
        return { productId: bySavedName, match: 'saved_name', candidates: [] };
      }
      const byReference = references.get(line.reference?.trim().toLowerCase() ?? '');
      if (byReference) {
        return { productId: byReference, match: 'reference', candidates: [] };
      }
      return { productId: null, match: null, candidates: [] };
    });

    const unsure = lines.flatMap((line, index) =>
      matches[index].productId === null && line.label ? [{ index, label: line.label }] : [],
    );
    const closest = await this.closestNames(unsure.map((line) => line.label));
    unsure.forEach(({ index }, position) => {
      const candidates = closest[position];
      const best = candidates[0];
      matches[index] =
        best && best.score >= CHOOSE_FROM
          ? { productId: best.productId, match: 'closest_name', candidates }
          : { productId: null, match: null, candidates };
    });
    return matches;
  }

  // The wordings this supplier's lines were validated as, in one lookup
  private async savedNames(supplierId: string | null, lines: LineToMatch[]) {
    const keys = [...new Set(lines.map((line) => (line.label ? labelKey(line.label) : '')))].filter(Boolean);
    if (!supplierId || keys.length === 0) {
      return new Map<string, string>();
    }
    const rows = await this.prisma.supplierProductName.findMany({
      where: { supplierId, labelKey: { in: keys }, product: { archivedAt: null } },
      select: { labelKey: true, productId: true },
    });
    return new Map(rows.map((row) => [row.labelKey, row.productId]));
  }

  // Case ignored, like the index that keeps one active product per reference
  private async references(lines: LineToMatch[]) {
    const references = [
      ...new Set(lines.map((line) => line.reference?.trim().toLowerCase() ?? '')),
    ].filter(Boolean);
    if (references.length === 0) {
      return new Map<string, string>();
    }
    const rows = await this.prisma.$queryRaw<{ id: string; reference: string }[]>`
      SELECT id, lower(reference) AS reference FROM products
      WHERE archived_at IS NULL AND lower(reference) IN (${Prisma.join(references)})`;
    return new Map(rows.map((row) => [row.reference, row.id]));
  }

  // The 3 most alike product names for each label, best first
  private async closestNames(labels: string[]): Promise<Candidate[][]> {
    if (labels.length === 0) {
      return [];
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('pg_trgm.similarity_threshold', ${String(SUGGEST_FROM)}, true)`;
      const found: Candidate[][] = [];
      for (const label of labels) {
        const rows = await tx.$queryRaw<{ id: string; score: number }[]>`
          SELECT id, similarity(lower(f_unaccent(name)), ${searchText(label)}) AS score
          FROM products
          WHERE archived_at IS NULL AND lower(f_unaccent(name)) % ${searchText(label)}
          ORDER BY score DESC, id
          LIMIT 3`;
        found.push(rows.map((row) => ({ productId: row.id, score: Math.round(row.score * 100) / 100 })));
      }
      return found;
    });
  }
}

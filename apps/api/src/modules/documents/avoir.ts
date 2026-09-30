import type { TvaBreakdownRow } from '@efactura/shared';

// A full avoir shows the cancelled invoice with every amount negative

export function minusLine<
  T extends { unitPriceHtCentimes: number; lineTotalHtCentimes: number },
>(line: T): T {
  return Object.assign({}, line, {
    unitPriceHtCentimes: -line.unitPriceHtCentimes,
    lineTotalHtCentimes: -line.lineTotalHtCentimes,
  });
}

export function minusBreakdown(rows: TvaBreakdownRow[]): TvaBreakdownRow[] {
  return rows.map((row) => ({
    rateBp: row.rateBp,
    baseHtCentimes: -row.baseHtCentimes,
    tvaCentimes: -row.tvaCentimes,
  }));
}

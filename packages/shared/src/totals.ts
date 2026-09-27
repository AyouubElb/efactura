import { assertCentimes, MAX_CENTIMES } from './money.js';

export interface LineInput {
  quantity: string; // "10", "2.5"
  unitPriceHtCentimes: number;
  tvaRateBp: number; // 2000 = 20 %
}

export interface TvaBreakdownRow {
  rateBp: number;
  baseHtCentimes: number;
  tvaCentimes: number;
}

export interface DocumentTotals {
  lineTotalsHtCentimes: number[];
  totalHtCentimes: number;
  totalTvaCentimes: number;
  totalTtcCentimes: number;
  tvaBreakdown: TvaBreakdownRow[]; // highest rate first
}

// quantity × unit price, rounded half-up
export function lineTotalHtCentimes(
  quantity: string,
  unitPriceHtCentimes: number,
): number {
  assertCentimes(unitPriceHtCentimes);
  if (unitPriceHtCentimes < 0) {
    throw new RangeError(
      `A unit price can't be negative: ${unitPriceHtCentimes}`,
    );
  }
  return divideHalfUp(
    parseQuantity(quantity) * BigInt(unitPriceHtCentimes),
    1000n,
  );
}

// TVA per rate on the total of its lines, so the recap always adds up
export function computeTotals(lines: LineInput[]): DocumentTotals {
  const lineTotalsHtCentimes: number[] = [];
  const baseByRate = new Map<number, number>();

  for (const line of lines) {
    assertRate(line.tvaRateBp);
    const lineTotal = lineTotalHtCentimes(
      line.quantity,
      line.unitPriceHtCentimes,
    );
    lineTotalsHtCentimes.push(lineTotal);
    baseByRate.set(
      line.tvaRateBp,
      (baseByRate.get(line.tvaRateBp) ?? 0) + lineTotal,
    );
  }

  const tvaBreakdown = [...baseByRate.entries()]
    .sort(([rateA], [rateB]) => rateB - rateA)
    .map(([rateBp, base]) => ({
      rateBp,
      baseHtCentimes: checked(base),
      tvaCentimes: divideHalfUp(BigInt(base) * BigInt(rateBp), 10_000n),
    }));

  const totalHtCentimes = checked(
    sum(tvaBreakdown.map((row) => row.baseHtCentimes)),
  );
  const totalTvaCentimes = checked(
    sum(tvaBreakdown.map((row) => row.tvaCentimes)),
  );
  const totalTtcCentimes = checked(totalHtCentimes + totalTvaCentimes);

  return {
    lineTotalsHtCentimes,
    totalHtCentimes,
    totalTvaCentimes,
    totalTtcCentimes,
    tvaBreakdown,
  };
}

// "2.5" → 2500 thousandths
function parseQuantity(quantity: string): bigint {
  const match = /^(\d{1,9})(?:\.(\d{1,3}))?$/.exec(quantity);
  if (!match) {
    throw new RangeError(`Not a quantity: "${quantity}"`);
  }
  const [, whole, decimals = ''] = match;
  return BigInt(whole) * 1000n + BigInt(decimals.padEnd(3, '0'));
}

// Half-up on whole numbers: add half the divisor, then truncate
function divideHalfUp(numerator: bigint, divisor: bigint): number {
  const result = (numerator + divisor / 2n) / divisor;
  if (result > BigInt(MAX_CENTIMES)) {
    throw new RangeError(`Amount too large: ${result} centimes`);
  }
  return Number(result);
}

function assertRate(rateBp: number): void {
  if (!Number.isInteger(rateBp) || rateBp < 0 || rateBp > 10_000) {
    throw new RangeError(`Not a TVA rate in basis points: ${rateBp}`);
  }
}

function checked(centimes: number): number {
  assertCentimes(centimes);
  return centimes;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

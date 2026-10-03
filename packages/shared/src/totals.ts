import { assertCentimes, MAX_CENTIMES } from './money.js';

// "10", "2.5": a dot and up to 3 decimals, never a float
export const QUANTITY_PATTERN = /^\d{1,9}(?:\.\d{1,3})?$/;

// A document line's quantity: the same format, above 0
export const LINE_QUANTITY_PATTERN = /^(?!0+(?:\.0+)?$)\d{1,9}(?:\.\d{1,3})?$/;

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

// A price printed with tax, before tax: 1 200,00 at 20 % → 1 000,00, rounded half-up
export function htFromTtcCentimes(ttcCentimes: number, tvaRateBp: number): number {
  assertCentimes(ttcCentimes);
  assertRate(tvaRateBp);
  if (ttcCentimes < 0) {
    throw new RangeError(`A price with tax can't be negative: ${ttcCentimes}`);
  }
  return divideHalfUp(BigInt(ttcCentimes) * 10_000n, BigInt(10_000 + tvaRateBp));
}

// "2.500" → "2,5", as printed on documents
export function formatQuantity(quantity: string): string {
  const thousandths = parseQuantity(quantity);
  const whole = (thousandths / 1000n).toString();
  const decimals = (thousandths % 1000n)
    .toString()
    .padStart(3, '0')
    .replace(/0+$/, '');
  return decimals ? `${whole},${decimals}` : whole;
}

// 2000 → "20 %", 550 → "5,5 %"; a no-break space keeps the sign on the line
export function formatRate(rateBp: number): string {
  assertRate(rateBp);
  const whole = Math.floor(rateBp / 100);
  const decimals = (rateBp % 100).toString().padStart(2, '0').replace(/0+$/, '');
  return `${decimals ? `${whole},${decimals}` : whole} %`;
}

// "2.5" → 2500 thousandths
function parseQuantity(quantity: string): bigint {
  if (!QUANTITY_PATTERN.test(quantity)) {
    throw new RangeError(`Not a quantity: "${quantity}"`);
  }
  const [whole, decimals = ''] = quantity.split('.');
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

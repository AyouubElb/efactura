// Amounts are whole centimes: 649000 is 6 490,00 DH
export const MAX_CENTIMES = 2_147_483_647;

// No-break space: an amount never splits across two lines
const THOUSANDS_SEPARATOR = ' ';

export function assertCentimes(value: number): void {
  if (!Number.isInteger(value) || Math.abs(value) > MAX_CENTIMES) {
    throw new RangeError(`Not a valid amount in centimes: ${value}`);
  }
}

// "5350.00" → 535000
export function parseDecimalToCentimes(text: string): number {
  const match = /^(-?)(\d{1,9})(?:\.(\d{1,2}))?$/.exec(text.trim());
  if (!match) {
    throw new RangeError(`Not an amount: "${text}"`);
  }
  const [, sign, dirhams, decimals = ''] = match;
  const centimes = Number(dirhams) * 100 + Number(decimals.padEnd(2, '0'));
  assertCentimes(centimes);
  return sign === '-' && centimes !== 0 ? -centimes : centimes;
}

// 649000 → "6 490,00"
export function formatMoney(centimes: number): string {
  assertCentimes(centimes);
  const sign = centimes < 0 ? '-' : '';
  const absolute = Math.abs(centimes);
  const dirhams = Math.floor(absolute / 100).toString();
  const decimals = (absolute % 100).toString().padStart(2, '0');
  const grouped = dirhams.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEPARATOR);
  return `${sign}${grouped},${decimals}`;
}

import { formatMoney, parseDecimalToCentimes } from '@efactura/shared';

// "3 575,50", "3575.5" or "3575" → 357550; null when it isn't an amount
export function parseMoneyInput(text: string): number | null {
  const compact = text.replace(/[\s  ]/g, '').replace(',', '.');
  if (!/^\d{1,9}(?:\.\d{1,2})?$/.test(compact)) {
    return null;
  }
  try {
    return parseDecimalToCentimes(compact);
  } catch {
    return null;
  }
}

export function moneyInputValue(centimes: number): string {
  return formatMoney(centimes);
}

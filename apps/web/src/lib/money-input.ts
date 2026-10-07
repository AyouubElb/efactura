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

// A supplier's discount line prints "-150,00": its sign is kept
export function parseSignedMoneyInput(text: string): number | null {
  const negative = /^\s*[-−]/.test(text);
  const centimes = parseMoneyInput(
    negative ? text.replace(/^\s*[-−]/, '') : text,
  );
  return centimes !== null && negative ? -centimes : centimes;
}

export function moneyInputValue(centimes: number): string {
  return formatMoney(centimes);
}

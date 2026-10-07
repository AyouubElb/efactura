import { formatQuantity, LINE_QUANTITY_PATTERN } from '@efactura/shared';

// "2,5", "2.5" or "10" → "2.5", "10"; null when it isn't a line's quantity
export function parseQuantityInput(text: string): string | null {
  const compact = text.replace(/\s/g, '').replace(',', '.');
  return LINE_QUANTITY_PATTERN.test(compact) ? compact : null;
}

// "2.500" → "2,5"
export function quantityInputValue(quantity: string): string {
  return formatQuantity(quantity);
}

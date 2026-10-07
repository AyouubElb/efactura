import {
  formatQuantity,
  htFromTtcCentimes,
  QUANTITY_PATTERN,
} from '@efactura/shared';
import type { ActionFailure } from '@/lib/action-result';
import { orNull, withoutSpaces } from '@/lib/form-rules';
import {
  moneyInputValue,
  parseMoneyInput,
  parseSignedMoneyInput,
} from '@/lib/money-input';
import type { ReviewInput, ReviewLineInput } from './purchases.schemas';
import type { DraftLine, NewProduct, PurchaseDraft } from './purchases.types';

function money(centimes: number | null): string {
  return centimes === null ? '' : moneyInputValue(centimes);
}

function rateText(rateBp: number | null): string {
  return rateBp === null ? '' : String(rateBp);
}

function rateOf(text: string): number | null {
  return text === '' ? null : Number(text);
}

// "2.500" → "2,5"; a value saved half-typed shows as it was typed
export function quantityText(quantity: string | null): string {
  if (quantity === null) {
    return '';
  }
  return QUANTITY_PATTERN.test(quantity)
    ? formatQuantity(quantity)
    : quantity.replace('.', ',');
}

// The form's starting values, from the last saved brouillon
export function reviewInput(draft: PurchaseDraft): ReviewInput {
  const { supplier, totals } = draft;
  return {
    documentType: draft.documentType,
    supplier: {
      id: supplier.id,
      name: supplier.name ?? '',
      ice: supplier.ice ?? '',
      ifNumber: supplier.ifNumber ?? '',
      address: supplier.address ?? '',
    },
    invoiceNumber: draft.invoiceNumber ?? '',
    invoiceDate: /^\d{4}-\d{2}-\d{2}$/.test(draft.invoiceDate ?? '')
      ? (draft.invoiceDate ?? '')
      : '',
    pricesIncludeTax: draft.pricesIncludeTax,
    lines: draft.lines.map(lineInput),
    totals: {
      ht: money(totals.htCentimes),
      tva: money(totals.tvaCentimes),
      ttc: money(totals.ttcCentimes),
    },
    notes: draft.notes,
  };
}

function lineInput(line: DraftLine): ReviewLineInput {
  const product = line.newProduct;
  return {
    label: line.label ?? '',
    reference: line.reference ?? '',
    quantity: quantityText(line.quantity),
    price: money(line.unitPriceCentimes),
    total: money(line.lineTotalCentimes),
    tvaRate: rateText(line.tvaRateBp),
    productId: line.productId,
    match: line.match,
    candidates: line.candidates,
    newProduct: product && {
      name: product.name ?? '',
      reference: product.reference ?? '',
      unit: product.unit ?? '',
      price: money(product.priceHtCentimes),
      tvaRate: rateText(product.tvaRateBp),
    },
    ignored: line.ignored,
    notes: line.notes,
  };
}

// What the API saves: whatever can be read, so half-typed values come back as typed
export function purchaseDraft(input: ReviewInput): PurchaseDraft {
  const { supplier, totals } = input;
  return {
    documentType: input.documentType,
    supplier: {
      id: supplier.id,
      name: orNull(supplier.name.trim()),
      ice: orNull(withoutSpaces(supplier.ice)),
      ifNumber: orNull(withoutSpaces(supplier.ifNumber)),
      address: orNull(supplier.address.trim()),
    },
    invoiceNumber: orNull(input.invoiceNumber.trim()),
    invoiceDate: orNull(input.invoiceDate),
    pricesIncludeTax: input.pricesIncludeTax,
    lines: input.lines.map(draftLine),
    totals: {
      htCentimes: parseSignedMoneyInput(totals.ht),
      tvaCentimes: parseSignedMoneyInput(totals.tva),
      ttcCentimes: parseSignedMoneyInput(totals.ttc),
    },
    notes: input.notes,
  };
}

function draftLine(line: ReviewLineInput): DraftLine {
  return {
    label: orNull(line.label.trim()),
    reference: orNull(line.reference.trim()),
    quantity: orNull(line.quantity.replace(/\s/g, '').replace(',', '.')),
    unitPriceCentimes: parseSignedMoneyInput(line.price),
    lineTotalCentimes: parseSignedMoneyInput(line.total),
    tvaRateBp: rateOf(line.tvaRate),
    productId: line.productId,
    match: line.match,
    candidates: line.candidates,
    newProduct: line.newProduct && newProduct(line.newProduct),
    ignored: line.ignored,
    notes: line.notes,
  };
}

function newProduct(
  product: NonNullable<ReviewLineInput['newProduct']>,
): NewProduct {
  return {
    name: orNull(product.name.trim()),
    reference: orNull(product.reference.trim()),
    unit: orNull(product.unit.trim()),
    priceHtCentimes: parseMoneyInput(product.price),
    tvaRateBp: rateOf(product.tvaRate),
  };
}

// One unit's cost before tax, as "Valider" will save it; null while a number is missing
export function unitCostHt(
  price: string,
  tvaRate: string,
  pricesIncludeTax: boolean,
): number | null {
  const centimes = parseSignedMoneyInput(price);
  if (centimes === null || centimes < 0) {
    return null;
  }
  if (!pricesIncludeTax) {
    return centimes;
  }
  const rateBp = rateOf(tvaRate);
  return rateBp === null || rateBp > 10_000
    ? null
    : htFromTtcCentimes(centimes, rateBp);
}

const FIELDS: Record<string, string> = {
  unitPriceCentimes: 'price',
  lineTotalCentimes: 'total',
  tvaRateBp: 'tvaRate',
  priceHtCentimes: 'price',
  htCentimes: 'ht',
  tvaCentimes: 'tva',
  ttcCentimes: 'ttc',
};

// The API's "lines.2.unitPriceCentimes" is the form's "lines.2.price"
export function onReviewFields(failure: ActionFailure): ActionFailure {
  if (!failure.fieldErrors) {
    return failure;
  }
  const fieldErrors = Object.fromEntries(
    Object.entries(failure.fieldErrors).map(([name, messages]) => {
      const parts = name.split('.');
      const last = parts.at(-1) ?? '';
      if (/^lines\.\d+\.newProduct$/.test(name)) {
        return [name.replace(/newProduct$/, 'productId'), messages];
      }
      if (name === 'lines') {
        return ['lines.root', messages];
      }
      if (name === 'supplier.id') {
        return ['supplier.name', messages];
      }
      return [
        [...parts.slice(0, -1), FIELDS[last] ?? last].join('.'),
        messages,
      ];
    }),
  );
  return { ...failure, fieldErrors };
}

import { formatMoney } from '@efactura/shared';
import type { InvoiceReading } from './extraction.schema.js';

// The person's working copy: it starts from the AI's answer, and only it is validated
export interface DraftLine {
  label: string | null;
  reference: string | null;
  // Decimal text, never a float: "30.5"
  quantity: string | null;
  unitPriceCentimes: number | null;
  lineTotalCentimes: number | null;
  tvaRateBp: number | null;
  // "Ignorer la ligne": a fee or a discount, kept here but never saved as a purchase line
  ignored: boolean;
  notes: string[];
}

export interface PurchaseDraft {
  documentType: InvoiceReading['document_type'];
  supplier: {
    // An existing supplier with the same ICE; null makes a new one at "Valider"
    id: string | null;
    name: string | null;
    ice: string | null;
    ifNumber: string | null;
    address: string | null;
  };
  invoiceNumber: string | null;
  invoiceDate: string | null;
  // Line prices stay as printed: with tax when true, their HT is computed from them
  pricesIncludeTax: boolean;
  lines: DraftLine[];
  totals: {
    htCentimes: number | null;
    tvaCentimes: number | null;
    ttcCentimes: number | null;
  };
  notes: string[];
}

const DECIMAL = /^(-?)(\d{1,9})(?:\.(\d{1,4}))?$/;

// "18.375" → 1838 centimes, rounded half-up; null when it isn't an amount
export function toCentimes(text: string | null): { value: number | null; rounded: boolean } {
  const match = text === null ? null : DECIMAL.exec(text.trim());
  if (!match) {
    return { value: null, rounded: false };
  }
  const [, sign, whole, fraction = ''] = match;
  const tenThousandths = Number(whole) * 10_000 + Number(fraction.padEnd(4, '0'));
  const centimes = Math.floor((tenThousandths + 50) / 100);
  return {
    value: sign === '-' && centimes !== 0 ? -centimes : centimes,
    rounded: tenThousandths % 100 !== 0,
  };
}

// "20" → 2000, "5.5" → 550
export function toRateBp(text: string | null): number | null {
  const match = text === null ? null : /^(\d{1,2})(?:\.(\d{1,2}))?$/.exec(text.trim());
  return match ? Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0')) : null;
}

const withoutSpaces = (text: string | null) => text?.replace(/\s+/g, '') || null;

export function startingDraft(answer: InvoiceReading, supplierId: string | null): PurchaseDraft {
  return {
    documentType: answer.document_type,
    supplier: {
      id: supplierId,
      name: answer.supplier.name,
      ice: withoutSpaces(answer.supplier.ice),
      ifNumber: withoutSpaces(answer.supplier.if_number),
      address: answer.supplier.address,
    },
    invoiceNumber: answer.invoice_number,
    invoiceDate: answer.invoice_date,
    pricesIncludeTax: answer.prices_include_tax,
    lines: answer.lines.map((line) => {
      const price = toCentimes(line.unit_price);
      const total = toCentimes(line.line_total);
      const notes: string[] = [];
      if (price.rounded && price.value !== null) {
        notes.push(`Prix arrondi au centime : ${line.unit_price?.replace('.', ',')} → ${formatMoney(price.value)}`);
      }
      if (total.rounded && total.value !== null) {
        notes.push(`Total arrondi au centime : ${line.line_total?.replace('.', ',')} → ${formatMoney(total.value)}`);
      }
      return {
        label: line.label,
        reference: line.reference,
        quantity: line.quantity,
        unitPriceCentimes: price.value,
        lineTotalCentimes: total.value,
        tvaRateBp: toRateBp(line.tva_rate),
        ignored: false,
        notes,
      };
    }),
    totals: {
      htCentimes: toCentimes(answer.totals.ht).value,
      tvaCentimes: toCentimes(answer.totals.tva).value,
      ttcCentimes: toCentimes(answer.totals.ttc).value,
    },
    notes: answer.notes,
  };
}

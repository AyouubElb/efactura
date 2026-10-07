import 'server-only';
import type { ActionFailure } from '@/lib/action-result';
import { parseMoneyInput } from '@/lib/money-input';
import { parseQuantityInput } from '@/lib/quantity';
import type { DraftInput } from './documents.schemas';

// What the API takes: never a total, it computes them
export function draftBody({ clientId, lines, notes }: DraftInput) {
  return {
    clientId,
    lines: lines.map((line) => ({
      productId: line.productId,
      label: line.label,
      unit: line.unit,
      quantity: checked(parseQuantityInput(line.quantity)),
      unitPriceHtCentimes: checked(parseMoneyInput(line.price)),
      tvaRateBp: Number(line.tvaRate),
    })),
    notes: notes === '' ? null : notes,
  };
}

function checked<T>(value: T | null): T {
  if (value === null) {
    throw new Error('A value draftSchema accepted could not be read');
  }
  return value;
}

const LINE_FIELDS: Record<string, string> = {
  unitPriceHtCentimes: 'price',
  tvaRateBp: 'tvaRate',
  productId: 'label',
};

// The API's "lines.2.unitPriceHtCentimes" is the form's "lines.2.price"
export function onDraftFields(failure: ActionFailure): ActionFailure {
  if (!failure.fieldErrors) {
    return failure;
  }
  const fieldErrors = Object.fromEntries(
    Object.entries(failure.fieldErrors).map(([name, messages]) => {
      const line = /^lines\.(\d+)\.(\w+)$/.exec(name);
      return line
        ? [`lines.${line[1]}.${LINE_FIELDS[line[2]] ?? line[2]}`, messages]
        : [name, messages];
    }),
  );
  return { ...failure, fieldErrors };
}

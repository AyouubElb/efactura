'use server';

import { refresh } from 'next/cache';
import {
  fromZod,
  GONE,
  isRecordId,
  toActionError,
  type ActionResult,
} from '@/lib/action-result';
import { apiSend } from '@/lib/api-server';
import { parseMoneyInput } from '@/lib/money-input';
import { productSchema, type ProductInput } from './products.schemas';
import type { Product } from './products.types';

const PLACES = {
  fields: { priceHtCentimes: 'price', tvaRateBp: 'tvaRate' },
  conflicts: { REFERENCE_TAKEN: 'reference' },
};

type Saved = ActionResult<{ name: string }>;

// id null: a new product
export async function saveProduct(
  id: string | null,
  input: ProductInput,
): Promise<Saved> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return fromZod(parsed.error);
  }
  if (id !== null && !isRecordId(id)) {
    return GONE;
  }
  const { name, reference, unit, price, tvaRate } = parsed.data;
  const body = {
    name,
    reference: reference || null,
    unit,
    priceHtCentimes: parseMoneyInput(price),
    tvaRateBp: Number(tvaRate),
  };
  const result =
    id === null
      ? await apiSend<Product>('POST', '/products', body)
      : await apiSend<Product>('PATCH', `/products/${id}`, body);
  if (!result.ok) {
    return toActionError(result.error, PLACES);
  }
  refresh();
  return { ok: true, data: { name: result.data.name } };
}

export async function setProductArchived(
  id: string,
  archived: boolean,
): Promise<Saved> {
  if (!isRecordId(id)) {
    return GONE;
  }
  const result = await apiSend<Product>(
    'POST',
    `/products/${id}/${archived ? 'archive' : 'restore'}`,
  );
  if (!result.ok) {
    return toActionError(result.error);
  }
  refresh();
  return { ok: true, data: { name: result.data.name } };
}

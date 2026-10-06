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
import { orNull, withoutSpaces } from '@/lib/form-rules';
import { supplierSchema, type SupplierInput } from './suppliers.schemas';
import type { Supplier } from './suppliers.types';

const PLACES = { conflicts: { SUPPLIER_EXISTS: 'ice' } };

type Saved = ActionResult<{ name: string }>;

// id null: a new supplier
export async function saveSupplier(
  id: string | null,
  input: SupplierInput,
): Promise<Saved> {
  const parsed = supplierSchema.safeParse(input);
  if (!parsed.success) {
    return fromZod(parsed.error);
  }
  if (id !== null && !isRecordId(id)) {
    return GONE;
  }
  const { name, ice, ifNumber, address, city, phone, email } = parsed.data;
  const body = {
    name,
    ice: orNull(withoutSpaces(ice)),
    ifNumber: orNull(ifNumber),
    address: orNull(address),
    city: orNull(city),
    phone: orNull(phone),
    email: orNull(email),
  };
  const result =
    id === null
      ? await apiSend<Supplier>('POST', '/suppliers', body)
      : await apiSend<Supplier>('PATCH', `/suppliers/${id}`, body);
  if (!result.ok) {
    return toActionError(result.error, PLACES);
  }
  refresh();
  return { ok: true, data: { name: result.data.name } };
}

export async function setSupplierArchived(
  id: string,
  archived: boolean,
): Promise<Saved> {
  if (!isRecordId(id)) {
    return GONE;
  }
  const result = await apiSend<Supplier>(
    'POST',
    `/suppliers/${id}/${archived ? 'archive' : 'restore'}`,
  );
  if (!result.ok) {
    return toActionError(result.error);
  }
  refresh();
  return { ok: true, data: { name: result.data.name } };
}

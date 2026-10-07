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
import { clientSchema, type ClientInput } from './clients.schemas';
import type { Client } from './clients.types';

const PLACES = { conflicts: { CLIENT_EXISTS: 'ice' } };

type Saved = ActionResult<{ name: string }>;

// id null: a new client. A devis or facture's editor picks the one returned, and keeps its page as it is
export async function saveClient(
  id: string | null,
  input: ClientInput,
  refreshPage = true,
): Promise<ActionResult<Client>> {
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) {
    return fromZod(parsed.error);
  }
  if (id !== null && !isRecordId(id)) {
    return GONE;
  }
  const { type, name, ice, address, city, email, phone, paymentDays } =
    parsed.data;
  const body = {
    type,
    name,
    ice: type === 'company' ? withoutSpaces(ice) : null,
    address: orNull(address),
    city: orNull(city),
    email: orNull(email),
    phone: orNull(phone),
    paymentDays: paymentDays === '' ? null : Number(paymentDays),
  };
  const result =
    id === null
      ? await apiSend<Client>('POST', '/clients', body)
      : await apiSend<Client>('PATCH', `/clients/${id}`, body);
  if (!result.ok) {
    return toActionError(result.error, PLACES);
  }
  if (refreshPage) {
    refresh();
  }
  return { ok: true, data: result.data };
}

export async function setClientArchived(
  id: string,
  archived: boolean,
): Promise<Saved> {
  if (!isRecordId(id)) {
    return GONE;
  }
  const result = await apiSend<Client>(
    'POST',
    `/clients/${id}/${archived ? 'archive' : 'restore'}`,
  );
  if (!result.ok) {
    return toActionError(result.error);
  }
  refresh();
  return { ok: true, data: { name: result.data.name } };
}

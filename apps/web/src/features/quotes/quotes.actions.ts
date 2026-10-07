'use server';

import { refresh } from 'next/cache';
import { z } from 'zod';
import {
  channelSchema,
  draftSchema,
  type DraftInput,
} from '@/features/documents/documents.schemas';
import type {
  Delivery,
  SendChannel,
} from '@/features/documents/documents.types';
import { draftBody, onDraftFields } from '@/features/documents/drafts';
import type { Invoice } from '@/features/invoices/invoices.types';
import {
  fromZod,
  GONE,
  isRecordId,
  toActionError,
  type ActionResult,
} from '@/lib/action-result';
import { apiSend } from '@/lib/api-server';
import type { Quote, QuoteDelivered } from './quotes.types';

type Sent = ActionResult<{ number: string; delivery: Delivery }>;

// id null: a new draft. Each save writes a history line, so the editor saves on request only
export async function saveQuote(
  id: string | null,
  input: DraftInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) {
    return fromZod(parsed.error);
  }
  if (id !== null && !isRecordId(id)) {
    return GONE;
  }
  const body = draftBody(parsed.data);
  const result =
    id === null
      ? await apiSend<Quote>('POST', '/quotes', body)
      : await apiSend<Quote>('PATCH', `/quotes/${id}`, body);
  if (!result.ok) {
    return onDraftFields(toActionError(result.error));
  }
  if (id !== null) {
    refresh();
  }
  return { ok: true, data: { id: result.data.id } };
}

// The number is given here; the page is drawn again once the dialog has shown the next step
export async function sendQuote(
  id: string,
  channel: SendChannel,
): Promise<Sent> {
  return deliver(id, channel, 'send');
}

export async function deliverQuote(
  id: string,
  channel: SendChannel,
): Promise<Sent> {
  return deliver(id, channel, 'deliver');
}

async function deliver(
  id: string,
  channel: SendChannel,
  route: 'send' | 'deliver',
): Promise<Sent> {
  if (!isRecordId(id) || !channelSchema.safeParse(channel).success) {
    return GONE;
  }
  const result = await apiSend<QuoteDelivered>(
    'POST',
    `/quotes/${id}/${route}`,
    { channel },
  );
  if (!result.ok) {
    return toActionError(result.error);
  }
  const { quote, delivery } = result.data;
  return { ok: true, data: { number: quote.number ?? '', delivery } };
}

export async function deleteQuote(id: string): Promise<ActionResult> {
  if (!isRecordId(id)) {
    return GONE;
  }
  const result = await apiSend('DELETE', `/quotes/${id}`);
  return result.ok ? { ok: true } : toActionError(result.error);
}

export async function decideQuote(
  id: string,
  decision: 'accept' | 'refuse',
): Promise<ActionResult> {
  if (!isRecordId(id) || (decision !== 'accept' && decision !== 'refuse')) {
    return GONE;
  }
  const result = await apiSend<Quote>('POST', `/quotes/${id}/${decision}`);
  if (!result.ok) {
    return toActionError(result.error);
  }
  refresh();
  return { ok: true };
}

// A new draft with the same number and the next version
export async function reviseQuote(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  if (!isRecordId(id)) {
    return GONE;
  }
  const result = await apiSend<Quote>('POST', `/quotes/${id}/revise`);
  return result.ok
    ? { ok: true, data: { id: result.data.id } }
    : toActionError(result.error);
}

const extendSchema = z.object({
  validUntil: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Choisissez la nouvelle date.'),
});

export async function extendQuote(
  id: string,
  input: z.infer<typeof extendSchema>,
): Promise<ActionResult> {
  const parsed = extendSchema.safeParse(input);
  if (!parsed.success) {
    return fromZod(parsed.error);
  }
  if (!isRecordId(id)) {
    return GONE;
  }
  const result = await apiSend<Quote>(
    'POST',
    `/quotes/${id}/extend`,
    parsed.data,
  );
  if (!result.ok) {
    return toActionError(result.error);
  }
  refresh();
  return { ok: true };
}

// A facture draft with the same lines: a devis converts once
export async function convertQuote(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  if (!isRecordId(id)) {
    return GONE;
  }
  const result = await apiSend<Invoice>('POST', `/quotes/${id}/convert`);
  return result.ok
    ? { ok: true, data: { id: result.data.id } }
    : toActionError(result.error);
}

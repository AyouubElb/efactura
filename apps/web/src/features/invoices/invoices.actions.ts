'use server';

import { refresh } from 'next/cache';
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
import {
  fromZod,
  GONE,
  isRecordId,
  toActionError,
  type ActionResult,
} from '@/lib/action-result';
import { apiSend } from '@/lib/api-server';
import {
  cancelSchema,
  paySchema,
  type CancelInput,
  type PayInput,
} from './invoices.schemas';
import type {
  CreditNoteDelivered,
  Invoice,
  InvoiceCancelled,
  InvoiceDelivered,
} from './invoices.types';

type Sent = ActionResult<{ number: string; delivery: Delivery }>;

// id null: a new draft. Each save writes a history line, so the editor saves on request only
export async function saveInvoice(
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
      ? await apiSend<Invoice>('POST', '/invoices', body)
      : await apiSend<Invoice>('PATCH', `/invoices/${id}`, body);
  if (!result.ok) {
    return onDraftFields(toActionError(result.error));
  }
  if (id !== null) {
    refresh();
  }
  return { ok: true, data: { id: result.data.id } };
}

// The FA number and the due date are given here; the page is drawn again after the dialog's next step
export async function sendInvoice(
  id: string,
  channel: SendChannel,
): Promise<Sent> {
  return deliver(id, channel, 'send');
}

export async function deliverInvoice(
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
  const result = await apiSend<InvoiceDelivered>(
    'POST',
    `/invoices/${id}/${route}`,
    { channel },
  );
  if (!result.ok) {
    return toActionError(result.error);
  }
  const { invoice, delivery } = result.data;
  return { ok: true, data: { number: invoice.number ?? '', delivery } };
}

export async function deleteInvoice(id: string): Promise<ActionResult> {
  if (!isRecordId(id)) {
    return GONE;
  }
  const result = await apiSend('DELETE', `/invoices/${id}`);
  return result.ok ? { ok: true } : toActionError(result.error);
}

export async function payInvoice(
  id: string,
  input: PayInput,
): Promise<ActionResult> {
  const parsed = paySchema.safeParse(input);
  if (!parsed.success) {
    return fromZod(parsed.error);
  }
  if (!isRecordId(id)) {
    return GONE;
  }
  const { paidOn, method, reference } = parsed.data;
  const result = await apiSend<Invoice>('POST', `/invoices/${id}/pay`, {
    paidOn,
    method,
    reference: reference === '' ? null : reference,
  });
  if (!result.ok) {
    return toActionError(result.error);
  }
  refresh();
  return { ok: true };
}

// Admin: a payment marked by mistake; the history keeps it
export async function unpayInvoice(id: string): Promise<ActionResult> {
  if (!isRecordId(id)) {
    return GONE;
  }
  const result = await apiSend<Invoice>('POST', `/invoices/${id}/unpay`);
  if (!result.ok) {
    return toActionError(result.error);
  }
  refresh();
  return { ok: true };
}

// A full avoir, numbered at once; the page is drawn again after the dialog's next step
export async function cancelInvoice(
  id: string,
  input: CancelInput,
): Promise<
  ActionResult<{ creditNoteId: string; number: string; delivery: Delivery }>
> {
  const parsed = cancelSchema.safeParse(input);
  if (!parsed.success) {
    return fromZod(parsed.error);
  }
  if (!isRecordId(id)) {
    return GONE;
  }
  const result = await apiSend<InvoiceCancelled>(
    'POST',
    `/invoices/${id}/cancel`,
    parsed.data,
  );
  if (!result.ok) {
    return toActionError(result.error);
  }
  const { creditNote, delivery } = result.data;
  return {
    ok: true,
    data: { creditNoteId: creditNote.id, number: creditNote.number, delivery },
  };
}

export async function deliverCreditNote(
  id: string,
  channel: SendChannel,
): Promise<Sent> {
  if (!isRecordId(id) || !channelSchema.safeParse(channel).success) {
    return GONE;
  }
  const result = await apiSend<CreditNoteDelivered>(
    'POST',
    `/credit-notes/${id}/deliver`,
    { channel },
  );
  if (!result.ok) {
    return toActionError(result.error);
  }
  const { creditNote, delivery } = result.data;
  return { ok: true, data: { number: creditNote.number, delivery } };
}

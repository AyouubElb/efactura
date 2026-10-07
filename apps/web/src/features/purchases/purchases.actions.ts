'use server';

import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  fromZod,
  GONE,
  isRecordId,
  sentence,
  toActionError,
  type ActionFailure,
  type ActionResult,
} from '@/lib/action-result';
import type { ApiError } from '@/lib/api-core';
import { apiSend } from '@/lib/api-server';
import { onReviewFields, purchaseDraft } from './drafts';
import {
  registerSchema,
  reviewSaveSchema,
  uploadLinkSchema,
  type RegisterInput,
  type ReviewInput,
  type UploadLinkInput,
} from './purchases.schemas';
import type { PurchaseDetail, UploadLink } from './purchases.types';

// A refused upload can point at an achat: the one already imported, or one whose read didn't start
export type UploadFailure = ActionFailure & { purchaseId?: string };

function uploadFailure(error: ApiError): UploadFailure {
  return { ...toActionError(error), purchaseId: error.purchaseId };
}

// Before any upload: the same file already imported stops here, before any AI cost
export async function getUploadUrl(
  input: UploadLinkInput,
): Promise<{ ok: true; data: UploadLink } | UploadFailure> {
  const parsed = uploadLinkSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Fichier refusé : un PDF, JPEG, PNG ou WebP de 10 Mo au plus.',
    };
  }
  const result = await apiSend<UploadLink>(
    'POST',
    '/purchases/upload-url',
    parsed.data,
  );
  return result.ok
    ? { ok: true, data: result.data }
    : uploadFailure(result.error);
}

// The file is in storage: the achat is made and its read queued, then its page opens
export async function registerUpload(
  input: RegisterInput,
): Promise<UploadFailure> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return GONE;
  }
  const result = await apiSend<PurchaseDetail>(
    'POST',
    '/purchases',
    parsed.data,
  );
  if (!result.ok) {
    return uploadFailure(result.error);
  }
  redirect(`/purchases/${result.data.id}`);
}

// Saved as the person types: no history line, and the page isn't drawn again
export async function saveReview(
  id: string,
  input: ReviewInput,
): Promise<ActionResult<{ savedAt: string }>> {
  const parsed = reviewSaveSchema.safeParse(input);
  if (!parsed.success) {
    return fromZod(parsed.error);
  }
  if (!isRecordId(id)) {
    return GONE;
  }
  const result = await apiSend<{ updatedAt: string }>(
    'PUT',
    `/purchases/${id}/review`,
    purchaseDraft(parsed.data),
  );
  return result.ok
    ? { ok: true, data: { savedAt: result.data.updatedAt } }
    : toActionError(result.error);
}

// "Valider" reads the last saved brouillon: the screen saves first
export async function confirmPurchase(id: string): Promise<ActionResult> {
  if (!isRecordId(id)) {
    return GONE;
  }
  const result = await apiSend<PurchaseDetail>(
    'POST',
    `/purchases/${id}/confirm`,
  );
  if (!result.ok) {
    return confirmFailure(result.error);
  }
  refresh();
  return { ok: true };
}

const SAME_DOCUMENT = "Écartez celui-ci s'il s'agit du même document.";

// A taken number or reference names its field too, so it lands under it
function confirmFailure(error: ApiError): ActionFailure {
  if (error.statusCode !== 409 || !error.fields) {
    return onReviewFields(toActionError(error));
  }
  const hint = error.code === 'NUMBER_CONFIRMED' ? ` ${SAME_DOCUMENT}` : '';
  return onReviewFields({
    ok: false,
    error: sentence(error.message),
    code: error.code,
    fieldErrors: Object.fromEntries(
      Object.entries(error.fields).map(([field, message]) => [
        field,
        [`${sentence(message)}${hint}`],
      ]),
    ),
  });
}

export async function retryRead(id: string): Promise<ActionResult> {
  return change(id, 'retry');
}

export async function discardPurchase(id: string): Promise<ActionResult> {
  return change(id, 'discard');
}

async function change(
  id: string,
  route: 'retry' | 'discard',
): Promise<ActionResult> {
  if (!isRecordId(id)) {
    return GONE;
  }
  const result = await apiSend<PurchaseDetail>(
    'POST',
    `/purchases/${id}/${route}`,
  );
  if (!result.ok) {
    return toActionError(result.error);
  }
  refresh();
  return { ok: true };
}

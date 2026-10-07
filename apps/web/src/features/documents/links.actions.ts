'use server';

import { refresh } from 'next/cache';
import {
  GONE,
  isRecordId,
  toActionError,
  type ActionResult,
} from '@/lib/action-result';
import { apiSend } from '@/lib/api-server';

// Admin: a link sent to the wrong number stops opening; the next WhatsApp send makes a new one
export async function revokeLink(linkId: string): Promise<ActionResult> {
  if (!isRecordId(linkId)) {
    return GONE;
  }
  const result = await apiSend('POST', `/share-links/${linkId}/revoke`);
  if (!result.ok) {
    return toActionError(result.error);
  }
  refresh();
  return { ok: true };
}

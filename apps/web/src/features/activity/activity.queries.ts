import 'server-only';
import type { HistoryEntry } from '@/features/documents/documents.types';
import { apiGetPage } from '@/lib/api-server';
import type { ListParams } from '@/lib/list-params';

// Admin only: the whole shop's history, newest first
export function listActivity({ page, user }: ListParams) {
  const query = new URLSearchParams({ page: String(page) });
  if (user) {
    query.set('userId', user);
  }
  return apiGetPage<HistoryEntry>(`/activity?${query}`);
}

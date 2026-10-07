import 'server-only';
import { cache } from 'react';
import { apiGet, apiGetPage } from '@/lib/api-server';
import type { ListParams } from '@/lib/list-params';
import type { PurchaseDetail, PurchaseRow } from './purchases.types';

export function listPurchases({ status, page }: ListParams) {
  const query = new URLSearchParams({ page: String(page) });
  if (status) {
    query.set('status', status);
  }
  return apiGetPage<PurchaseRow>(`/purchases?${query}`);
}

// The "À vérifier" tab's count
export async function countToReview(): Promise<number> {
  const { meta } = await apiGetPage<PurchaseRow>(
    '/purchases?status=ready&pageSize=1',
  );
  return meta.total;
}

// Once per page drawn: the title and the page both read it
export const getPurchase = cache((id: string) =>
  apiGet<PurchaseDetail>(`/purchases/${id}`),
);

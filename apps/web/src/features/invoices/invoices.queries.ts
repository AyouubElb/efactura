import 'server-only';
import { cache } from 'react';
import { apiGet, apiGetPage } from '@/lib/api-server';
import { apiDocumentListQuery, type ListParams } from '@/lib/list-params';
import type { CreditNote, Invoice, InvoiceRow } from './invoices.types';

export function listInvoices(params: ListParams) {
  return apiGetPage<InvoiceRow>(`/invoices?${apiDocumentListQuery(params)}`);
}

// The "En retard" tab's count, for the same client filter
export async function countLate(client: string | undefined): Promise<number> {
  const query = new URLSearchParams({ status: 'late', pageSize: '1' });
  if (client) {
    query.set('clientId', client);
  }
  const { meta } = await apiGetPage<InvoiceRow>(`/invoices?${query}`);
  return meta.total;
}

// Once per page drawn: the title and the page both read them
export const getInvoice = cache((id: string) =>
  apiGet<Invoice>(`/invoices/${id}`),
);

export const getCreditNote = cache((id: string) =>
  apiGet<CreditNote>(`/credit-notes/${id}`),
);

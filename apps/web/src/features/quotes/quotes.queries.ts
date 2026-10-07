import 'server-only';
import { cache } from 'react';
import { apiGet, apiGetPage } from '@/lib/api-server';
import { apiDocumentListQuery, type ListParams } from '@/lib/list-params';
import type { Quote, QuoteRow } from './quotes.types';

export function listQuotes(params: ListParams) {
  return apiGetPage<QuoteRow>(`/quotes?${apiDocumentListQuery(params)}`);
}

// Once per page drawn: the title and the page both read it
export const getQuote = cache((id: string) => apiGet<Quote>(`/quotes/${id}`));

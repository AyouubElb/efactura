import 'server-only';
import { apiGet, apiGetPage } from '@/lib/api-server';
import { apiListQuery, type ListParams } from '@/lib/list-params';
import type { Client } from './clients.types';

export function listClients(params: ListParams) {
  return apiGetPage<Client>(`/clients?${apiListQuery(params)}`);
}

export function getClient(id: string) {
  return apiGet<Client>(`/clients/${id}`);
}

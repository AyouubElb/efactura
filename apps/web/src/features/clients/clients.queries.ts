import 'server-only';
import { apiGetPage } from '@/lib/api-server';
import { apiListQuery, type ListParams } from '@/lib/list-params';
import type { Client } from './clients.types';

export function listClients(params: ListParams) {
  return apiGetPage<Client>(`/clients?${apiListQuery(params)}`);
}

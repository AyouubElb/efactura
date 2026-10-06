import 'server-only';
import { apiGetPage } from '@/lib/api-server';
import { apiListQuery, type ListParams } from '@/lib/list-params';
import type { Supplier } from './suppliers.types';

export function listSuppliers(params: ListParams) {
  return apiGetPage<Supplier>(`/suppliers?${apiListQuery(params)}`);
}

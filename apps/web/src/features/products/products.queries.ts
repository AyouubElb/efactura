import 'server-only';
import { apiGetPage } from '@/lib/api-server';
import { apiListQuery, type ListParams } from '@/lib/list-params';
import type { Product } from './products.types';

export function listProducts(params: ListParams) {
  return apiGetPage<Product>(`/products?${apiListQuery(params)}`);
}

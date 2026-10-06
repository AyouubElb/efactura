import 'server-only';
import { cache } from 'react';
import { apiGet } from '@/lib/api-server';
import type { SeriesCounter, Settings } from './settings.types';

export const getSettings = cache(() => apiGet<Settings>('/settings'));

export function getNumbering() {
  return apiGet<SeriesCounter[]>('/settings/numbering');
}

import 'server-only';
import { cache } from 'react';
import { apiGet } from '@/lib/api-server';

export interface Settings {
  configured: boolean;
  identity: { legalName: string } | null;
}

export const getSettings = cache(() => apiGet<Settings>('/settings'));

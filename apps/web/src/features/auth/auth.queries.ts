import 'server-only';
import { cache } from 'react';
import { apiGet } from '@/lib/api-server';
import type { Me } from './auth.types';

// One call per page drawn, shared by the frame and the page
export const getMe = cache(() => apiGet<Me>('/auth/me'));

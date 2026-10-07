import 'server-only';
import { apiGet } from '@/lib/api-server';
import type { DashboardTotals, RecentDocument } from './dashboard.types';

// Admin only: the API refuses the amounts to a Collaborateur
export function getTotals() {
  return apiGet<DashboardTotals>('/dashboard/totals');
}

export function getRecent() {
  return apiGet<RecentDocument[]>('/dashboard/recent');
}

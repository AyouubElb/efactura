import type { DocumentKind } from '@/features/documents/documents.types';

export interface Amount {
  totalTtcCentimes: number;
  count: number;
}

// "Collected" means marked paid by a person: the app never talks to the bank
export interface DashboardTotals {
  month: string;
  collectedThisMonth: Amount;
  waiting: Amount;
  late: Amount;
  purchasesThisMonth: Amount;
}

export type RecentStatus =
  | 'draft'
  | 'sent'
  | 'expired'
  | 'accepted'
  | 'refused'
  | 'replaced'
  | 'late'
  | 'paid'
  | 'cancelled'
  | 'issued';

export interface RecentDocument {
  type: DocumentKind;
  id: string;
  number: string | null;
  status: RecentStatus;
  client: string;
  totalTtcCentimes: number;
  changedAt: string;
}

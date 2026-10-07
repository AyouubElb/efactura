import type {
  ClientSnapshot,
  Delivery,
  DocumentLine,
  HistoryEntry,
  InvoiceStatus,
  QuoteStatus,
  SendChannel,
  ShareLink,
  TvaRow,
  UserRef,
} from '@/features/documents/documents.types';

export const QUOTE_TABS = [
  'draft',
  'sent',
  'expired',
  'accepted',
  'refused',
  'replaced',
] as const;

export interface QuoteRow {
  id: string;
  // "DV-2026-0009-v2"; empty until the first version is sent
  number: string | null;
  version: number;
  status: QuoteStatus;
  expired: boolean;
  client: { id: string; name: string };
  issueDate: string | null;
  validUntil: string | null;
  totalHtCentimes: number;
  totalTvaCentimes: number;
  totalTtcCentimes: number;
  sentVia: SendChannel | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteVersionRef {
  id: string;
  number: string | null;
  status: QuoteStatus;
}

export interface Quote extends QuoteRow {
  lines: DocumentLine[];
  tvaBreakdown: TvaRow[];
  totalInWords: string | null;
  notes: string | null;
  clientSnapshot: ClientSnapshot | null;
  previousVersion: QuoteVersionRef | null;
  nextVersion: QuoteVersionRef | null;
  invoice: { id: string; number: string | null; status: InvoiceStatus } | null;
  pdfReady: boolean;
  shareLink: ShareLink | null;
  createdBy: UserRef;
  sentBy: UserRef | null;
  history: HistoryEntry[];
}

export interface QuoteDelivered {
  quote: Quote;
  delivery: Delivery;
}

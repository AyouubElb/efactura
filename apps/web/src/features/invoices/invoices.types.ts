import type {
  ClientSnapshot,
  Delivery,
  DocumentLine,
  HistoryEntry,
  InvoiceStatus,
  PaymentMethod,
  SendChannel,
  ShareLink,
  TvaRow,
  UserRef,
} from '@/features/documents/documents.types';

export const INVOICE_TABS = [
  'draft',
  'sent',
  'late',
  'paid',
  'cancelled',
] as const;

export interface InvoiceRow {
  id: string;
  // Empty until the invoice is sent
  number: string | null;
  status: InvoiceStatus;
  late: boolean;
  client: { id: string; name: string };
  issueDate: string | null;
  dueDate: string | null;
  totalHtCentimes: number;
  totalTvaCentimes: number;
  totalTtcCentimes: number;
  paidOn: string | null;
  paymentMethod: PaymentMethod | null;
  sentVia: SendChannel | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice extends InvoiceRow {
  lines: DocumentLine[];
  tvaBreakdown: TvaRow[];
  totalInWords: string | null;
  notes: string | null;
  clientSnapshot: ClientSnapshot | null;
  quote: { id: string; number: string } | null;
  creditNote: { id: string; number: string; reason: string } | null;
  paymentReference: string | null;
  paidRecordedBy: UserRef | null;
  pdfReady: boolean;
  shareLink: ShareLink | null;
  createdBy: UserRef;
  sentBy: UserRef | null;
  history: HistoryEntry[];
}

export interface InvoiceDelivered {
  invoice: Invoice;
  delivery: Delivery;
}

// A full avoir: the invoice's amounts, made negative
export interface CreditNote {
  id: string;
  number: string;
  invoice: { id: string; number: string };
  client: { id: string; name: string };
  reason: string;
  issueDate: string;
  totalHtCentimes: number;
  totalTvaCentimes: number;
  totalTtcCentimes: number;
  totalInWords: string;
  lines: DocumentLine[];
  tvaBreakdown: TvaRow[];
  clientSnapshot: ClientSnapshot;
  sentVia: SendChannel | null;
  pdfReady: boolean;
  shareLink: ShareLink | null;
  createdBy: UserRef;
  createdAt: string;
  history: HistoryEntry[];
}

export interface CreditNoteDelivered {
  creditNote: CreditNote;
  delivery: Delivery;
}

export interface InvoiceCancelled {
  invoice: Invoice;
  creditNote: CreditNote;
  delivery: Delivery;
}

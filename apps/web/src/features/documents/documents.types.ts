import type { ClientType } from '@/features/clients/clients.types';

export type DocumentKind = 'quote' | 'invoice' | 'credit_note';
export type SendChannel = 'whatsapp' | 'email' | 'download';
export type QuoteStatus =
  'draft' | 'sent' | 'accepted' | 'refused' | 'replaced';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'cancelled';
export type PaymentMethod = 'cash' | 'cheque' | 'transfer' | 'card' | 'effet';

export interface DocumentLine {
  position: number;
  productId: string | null;
  label: string;
  reference: string | null;
  unit: string;
  quantity: string;
  unitPriceHtCentimes: number;
  tvaRateBp: number;
  lineTotalHtCentimes: number;
}

export interface TvaRow {
  rateBp: number;
  baseHtCentimes: number;
  tvaCentimes: number;
}

// The client as the document printed it
export interface ClientSnapshot {
  type: ClientType;
  name: string;
  ice: string | null;
  address: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
  paymentDays: number;
}

export interface UserRef {
  id: string;
  fullName: string;
}

export interface ShareLink {
  id: string;
  url: string;
  openCount: number;
  lastOpenedAt: string | null;
  expiresAt: string;
  revokedAt: string | null;
}

export interface HistoryEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  createdAt: string;
  user: UserRef | null;
}

export interface Delivery {
  channel: SendChannel;
  whatsappUrl: string | null;
  emailTo: string | null;
}

// What a document's page prints, whatever its kind
export interface PrintedDocument {
  lines: DocumentLine[];
  tvaBreakdown: TvaRow[];
  totalHtCentimes: number;
  totalTvaCentimes: number;
  totalTtcCentimes: number;
  totalInWords: string | null;
  notes?: string | null;
}

export interface ProductOption {
  id: string;
  name: string;
  reference: string | null;
  unit: string;
  priceHtCentimes: number;
  tvaRateBp: number;
}

// The editor's starting values: a saved draft, a new one, or a copy
export interface DraftStart {
  id: string | null;
  clientId: string | null;
  lines: DocumentLine[];
  notes: string | null;
}

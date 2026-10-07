import type { StampTone } from '@/components/stamp';
import type {
  DocumentKind,
  InvoiceStatus,
  PaymentMethod,
  QuoteStatus,
  SendChannel,
} from './documents.types';

export interface StatusLook {
  label: string;
  tone: StampTone;
}

// 09's labels, each in its colour family; expired and late are worked out by the API
export function quoteLook(status: QuoteStatus, expired: boolean): StatusLook {
  switch (status) {
    case 'draft':
      return { label: 'Brouillon', tone: 'draft' };
    case 'sent':
      return expired
        ? { label: 'Expiré', tone: 'check' }
        : { label: 'Envoyé', tone: 'way' };
    case 'accepted':
      return { label: 'Accepté', tone: 'done' };
    case 'refused':
      return { label: 'Refusé', tone: 'closed' };
    case 'replaced':
      return { label: 'Remplacé', tone: 'closed' };
  }
}

export function invoiceLook(status: InvoiceStatus, late: boolean): StatusLook {
  switch (status) {
    case 'draft':
      return { label: 'Brouillon', tone: 'draft' };
    case 'sent':
      return late
        ? { label: 'En retard', tone: 'act' }
        : { label: 'Envoyée', tone: 'way' };
    case 'paid':
      return { label: 'Payée', tone: 'done' };
    case 'cancelled':
      return { label: 'Annulée', tone: 'closed' };
  }
}

export const CREDIT_NOTE_LOOK: StatusLook = { label: 'Envoyé', tone: 'way' };

export const KIND_LABELS: Record<DocumentKind, string> = {
  quote: 'Devis',
  invoice: 'Facture',
  credit_note: 'Avoir',
};

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'Espèces',
  cheque: 'Chèque',
  transfer: 'Virement',
  card: 'Carte',
  effet: 'Effet',
};

export const PAYMENT_WORDS: Record<PaymentMethod, string> = {
  cash: 'en espèces',
  cheque: 'par chèque',
  transfer: 'par virement',
  card: 'par carte',
  effet: 'par effet',
};

export const CHANNEL_WORDS: Record<SendChannel, string> = {
  whatsapp: 'par WhatsApp',
  email: 'par e-mail',
  download: 'en PDF téléchargé',
};

const PATHS: Record<DocumentKind, string> = {
  quote: '/quotes',
  invoice: '/invoices',
  credit_note: '/credit-notes',
};

const PDF_KINDS: Record<DocumentKind, string> = {
  quote: 'quote',
  invoice: 'invoice',
  credit_note: 'credit-note',
};

export function documentPath(kind: DocumentKind, id: string): string {
  return `${PATHS[kind]}/${id}`;
}

export function pdfPath(
  kind: DocumentKind,
  id: string,
  download = false,
): string {
  return `/pdf/${PDF_KINDS[kind]}/${id}${download ? '?download=1' : ''}`;
}

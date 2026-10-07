import type { StatusLook } from '@/features/documents/documents.labels';
import type {
  DocumentType,
  MatchMethod,
  PurchaseStatus,
} from './purchases.types';

const READING: StatusLook = { label: 'Lecture en cours', tone: 'way' };
const FAILED: StatusLook = { label: 'Échec de lecture', tone: 'act' };

// 09's labels; an upload whose read never started has a reason, and shows as failed
export function purchaseLook(
  status: PurchaseStatus,
  error: string | null = null,
): StatusLook {
  switch (status) {
    case 'uploaded':
      return error ? FAILED : READING;
    case 'reading':
      return READING;
    case 'ready':
      return { label: 'À vérifier', tone: 'check' };
    case 'confirmed':
      return { label: 'Validé', tone: 'done' };
    case 'failed':
      return FAILED;
    case 'discarded':
      return { label: 'Écarté', tone: 'closed' };
  }
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  invoice: 'Facture',
  delivery_note: 'Bon de livraison',
  quote: 'Devis',
  other: 'Autre document',
};

export const NOT_AN_INVOICE: Record<
  Exclude<DocumentType, 'invoice'>,
  string
> = {
  delivery_note: 'Ce document semble être un bon de livraison.',
  quote: 'Ce document semble être un devis.',
  other: 'Ce document ne semble pas être une facture.',
};

// How a line's product was found: the chips of 09
export const MATCH_LABELS: Record<MatchMethod, string> = {
  saved_name: 'Nom enregistré',
  reference: 'Référence',
  closest_name: 'Nom proche',
  manual: 'Choisi',
  new_product: 'Nouveau produit',
};

// 0.62 → "62 %"
export function scoreText(score: number): string {
  return `${Math.round(score * 100)} %`;
}

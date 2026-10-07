import type {
  HistoryEntry,
  UserRef,
} from '@/features/documents/documents.types';

export type PurchaseStatus =
  'uploaded' | 'reading' | 'ready' | 'confirmed' | 'failed' | 'discarded';
export type MatchMethod =
  'saved_name' | 'reference' | 'closest_name' | 'manual' | 'new_product';
export type DocumentType = 'invoice' | 'delivery_note' | 'quote' | 'other';
export type Readability = 'good' | 'fair' | 'poor';

// The list's tabs, as its address writes them
export const PURCHASE_TABS = [
  'ready',
  'reading',
  'confirmed',
  'failed',
  'discarded',
] as const;

export const FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
export type FileType = (typeof FILE_TYPES)[number];
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export interface PurchaseRow {
  id: string;
  status: PurchaseStatus;
  fileType: string;
  supplierName: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  totalTtcCentimes: number | null;
  uploadedBy: UserRef;
  createdAt: string;
}

// A close catalogue name: 0.62 means 62 % alike
export interface Candidate {
  productId: string;
  score: number;
}

// "Créer le produit": made at "Valider" only
export interface NewProduct {
  name: string | null;
  reference: string | null;
  unit: string | null;
  priceHtCentimes: number | null;
  tvaRateBp: number | null;
}

export interface DraftLine {
  label: string | null;
  reference: string | null;
  // Decimal text with a dot: "2.5"
  quantity: string | null;
  // As printed: with tax when the brouillon says so
  unitPriceCentimes: number | null;
  lineTotalCentimes: number | null;
  tvaRateBp: number | null;
  productId: string | null;
  match: MatchMethod | null;
  candidates: Candidate[];
  newProduct: NewProduct | null;
  ignored: boolean;
  notes: string[];
}

// The person's working copy: saved as they type, and the only thing "Valider" reads
export interface PurchaseDraft {
  documentType: DocumentType;
  supplier: {
    id: string | null;
    name: string | null;
    ice: string | null;
    ifNumber: string | null;
    address: string | null;
  };
  invoiceNumber: string | null;
  invoiceDate: string | null;
  pricesIncludeTax: boolean;
  lines: DraftLine[];
  totals: {
    htCentimes: number | null;
    tvaCentimes: number | null;
    ttcCentimes: number | null;
  };
  notes: string[];
}

export interface DraftProduct {
  id: string;
  name: string;
  reference: string | null;
  unit: string;
  priceHtCentimes: number;
  archived: boolean;
}

export interface PurchaseDetail extends PurchaseRow {
  pageCount: number | null;
  error: string | null;
  attempts: number;
  // Only what the screen reads of the AI's untouched answer
  proposal: { readability?: Readability } | null;
  draft: PurchaseDraft | null;
  products: DraftProduct[];
  history: HistoryEntry[];
}

export interface UploadLink {
  uploadUrl: string;
  fileKey: string;
}

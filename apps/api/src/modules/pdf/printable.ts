import type { TvaBreakdownRow } from '@efactura/shared';
import type { DocumentType } from '../../generated/prisma/client.js';
import type {
  ClientSnapshot,
  ShopSnapshot,
} from '../documents/snapshots.js';

export interface PrintableLine {
  label: string;
  reference: string | null;
  unit: string;
  quantity: string;
  unitPriceHtCentimes: number;
  tvaRateBp: number;
  lineTotalHtCentimes: number;
}

// Everything a PDF prints, and nothing it would have to look up
export interface Printable {
  kind: DocumentType;
  number: string | null;
  draft: boolean;
  issueDate: string | null;
  validUntil: string | null;
  dueDate: string | null;
  cancelledInvoice: string | null;
  reason: string | null;
  shop: ShopSnapshot;
  client: ClientSnapshot;
  lines: PrintableLine[];
  totalHtCentimes: number;
  totalTvaCentimes: number;
  totalTtcCentimes: number;
  tvaBreakdown: TvaBreakdownRow[];
  totalInWords: string | null;
  notes: string | null;
  // The send date: made twice, the PDF is the same file
  madeAt: Date;
}

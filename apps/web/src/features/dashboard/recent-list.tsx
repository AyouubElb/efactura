'use client';

import { useRouter } from 'next/navigation';
import { createColumnHelper } from '@tanstack/react-table';
import { formatMoney } from '@efactura/shared';
import {
  DataTable,
  type CardLines,
  type ListFeatures,
} from '@/components/data-table';
import { EmptyState } from '@/components/empty-state';
import { NewDocumentLink } from '@/components/new-document-link';
import { Stamp } from '@/components/stamp';
import {
  CREDIT_NOTE_LOOK,
  documentPath,
  invoiceLook,
  KIND_LABELS,
  quoteLook,
  type StatusLook,
} from '@/features/documents/documents.labels';
import type {
  InvoiceStatus,
  QuoteStatus,
} from '@/features/documents/documents.types';
import { dayInMorocco } from '@/lib/format';
import type { RecentDocument } from './dashboard.types';

const QUOTE_STATUSES: readonly string[] = [
  'draft',
  'sent',
  'accepted',
  'refused',
  'replaced',
];
const INVOICE_STATUSES: readonly string[] = [
  'draft',
  'sent',
  'paid',
  'cancelled',
];

function isQuoteStatus(status: string): status is QuoteStatus {
  return QUOTE_STATUSES.includes(status);
}

function isInvoiceStatus(status: string): status is InvoiceStatus {
  return INVOICE_STATUSES.includes(status);
}

// The API names expired and late outright, and an avoir "issued"
function lookOf({ type, status }: RecentDocument): StatusLook {
  switch (type) {
    case 'credit_note':
      return CREDIT_NOTE_LOOK;
    case 'quote':
      return quoteLook(
        isQuoteStatus(status) ? status : 'sent',
        status === 'expired',
      );
    case 'invoice':
      return invoiceLook(
        isInvoiceStatus(status) ? status : 'sent',
        status === 'late',
      );
  }
}

function RecentStamp({ document }: { document: RecentDocument }) {
  const look = lookOf(document);
  return <Stamp tone={look.tone}>{look.label}</Stamp>;
}

function NumberCell({ number }: { number: string | null }) {
  return number ? (
    <span className="ref whitespace-nowrap">{number}</span>
  ) : (
    <span className="font-normal text-pencil">Sans numéro</span>
  );
}

const helper = createColumnHelper<ListFeatures, RecentDocument>();

const columns = helper.columns([
  helper.accessor('number', {
    header: 'N°',
    cell: (info) => <NumberCell number={info.getValue()} />,
  }),
  helper.accessor('type', {
    header: 'Type',
    cell: (info) => KIND_LABELS[info.getValue()],
  }),
  helper.accessor('client', {
    header: 'Client',
    cell: (info) => info.getValue(),
    meta: { className: 'min-w-40 whitespace-normal' },
  }),
  helper.accessor('totalTtcCentimes', {
    header: 'TTC (MAD)',
    cell: (info) => formatMoney(info.getValue()),
    meta: { align: 'end' },
  }),
  helper.accessor('status', {
    header: 'Statut',
    cell: (info) => <RecentStamp document={info.row.original} />,
  }),
  helper.accessor('changedAt', {
    header: 'Modifié le',
    cell: (info) => dayInMorocco(info.getValue()),
    meta: { className: 'hidden xl:table-cell' },
  }),
]);

function card(document: RecentDocument): CardLines {
  return {
    title: <NumberCell number={document.number} />,
    titleEnd: formatMoney(document.totalTtcCentimes),
    detail: `${KIND_LABELS[document.type]} · ${document.client}`,
    detailEnd: <RecentStamp document={document} />,
  };
}

export function RecentList({ documents }: { documents: RecentDocument[] }) {
  const router = useRouter();
  if (documents.length === 0) {
    return (
      <EmptyState
        title="Aucun document pour l'instant."
        action={
          <NewDocumentLink href="/quotes/new">Nouveau devis</NewDocumentLink>
        }
      >
        Les devis, factures et avoirs récents s&apos;afficheront ici.
      </EmptyState>
    );
  }
  return (
    <DataTable
      label="Documents récents"
      columns={columns}
      data={documents}
      onOpen={(document) =>
        router.push(documentPath(document.type, document.id))
      }
      card={card}
    />
  );
}

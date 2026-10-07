'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createColumnHelper } from '@tanstack/react-table';
import { formatDate, formatMoney } from '@efactura/shared';
import {
  DataTable,
  type CardLines,
  type ListFeatures,
} from '@/components/data-table';
import { EmptyState } from '@/components/empty-state';
import { NewDocumentLink } from '@/components/new-document-link';
import { Stamp } from '@/components/stamp';
import { quoteLook } from '@/features/documents/documents.labels';
import type { ListParams } from '@/lib/list-params';
import type { QuoteRow } from './quotes.types';

const helper = createColumnHelper<ListFeatures, QuoteRow>();

function QuoteStamp({ quote }: { quote: QuoteRow }) {
  const look = quoteLook(quote.status, quote.expired);
  return <Stamp tone={look.tone}>{look.label}</Stamp>;
}

function NumberCell({ number }: { number: string | null }) {
  return number ? (
    <span className="ref whitespace-nowrap">{number}</span>
  ) : (
    <span className="font-normal text-pencil">Sans numéro</span>
  );
}

const columns = helper.columns([
  helper.accessor('number', {
    header: 'N°',
    cell: (info) => <NumberCell number={info.getValue()} />,
  }),
  helper.accessor((quote) => quote.client.name, {
    id: 'client',
    header: 'Client',
    cell: (info) => info.getValue(),
    meta: { className: 'min-w-40 whitespace-normal' },
  }),
  helper.accessor('issueDate', {
    header: 'Date',
    cell: (info) => {
      const day = info.getValue();
      return day && formatDate(day);
    },
  }),
  helper.accessor('validUntil', {
    header: "Valable jusqu'au",
    cell: (info) => {
      const day = info.getValue();
      return day && formatDate(day);
    },
    meta: { className: 'hidden xl:table-cell' },
  }),
  helper.accessor('totalTtcCentimes', {
    header: 'TTC (MAD)',
    cell: (info) => formatMoney(info.getValue()),
    meta: { align: 'end' },
  }),
  helper.accessor('status', {
    header: 'Statut',
    cell: (info) => <QuoteStamp quote={info.row.original} />,
  }),
]);

function card(quote: QuoteRow): CardLines {
  return {
    title: <NumberCell number={quote.number} />,
    titleEnd: formatMoney(quote.totalTtcCentimes),
    detail: [quote.client.name, quote.issueDate && formatDate(quote.issueDate)]
      .filter(Boolean)
      .join(' · '),
    detailEnd: <QuoteStamp quote={quote} />,
  };
}

const EMPTY_TABS: Record<string, string> = {
  draft: 'Aucun brouillon de devis',
  sent: 'Aucun devis en attente de réponse',
  expired: 'Aucun devis expiré',
  accepted: 'Aucun devis accepté',
  refused: 'Aucun devis refusé',
  replaced: 'Aucun devis remplacé',
};

export function QuoteList({
  quotes,
  params,
}: {
  quotes: QuoteRow[];
  params: ListParams;
}) {
  const router = useRouter();

  if (quotes.length === 0) {
    if (!params.status && !params.client) {
      return (
        <EmptyState
          title="Aucun devis pour l'instant."
          action={
            <NewDocumentLink href="/quotes/new">Nouveau devis</NewDocumentLink>
          }
        >
          {
            "Un devis reçoit son numéro quand vous l'envoyez, par WhatsApp, par e-mail ou en PDF."
          }
        </EmptyState>
      );
    }
    const tab = (params.status && EMPTY_TABS[params.status]) || 'Aucun devis';
    return (
      <EmptyState
        title={`${tab}${params.client ? ' pour ce client' : ''}.`}
        action={
          <Link href="/quotes" className="link text-label">
            Voir tous les devis
          </Link>
        }
      />
    );
  }

  return (
    <DataTable
      label="Devis"
      columns={columns}
      data={quotes}
      onOpen={(quote) => router.push(`/quotes/${quote.id}`)}
      card={card}
    />
  );
}

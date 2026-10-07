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
import { invoiceLook } from '@/features/documents/documents.labels';
import type { ListParams } from '@/lib/list-params';
import type { InvoiceRow } from './invoices.types';

const helper = createColumnHelper<ListFeatures, InvoiceRow>();

function InvoiceStamp({ invoice }: { invoice: InvoiceRow }) {
  const look = invoiceLook(invoice.status, invoice.late);
  return <Stamp tone={look.tone}>{look.label}</Stamp>;
}

function NumberCell({ number }: { number: string | null }) {
  return number ? (
    <span className="ref whitespace-nowrap">{number}</span>
  ) : (
    <span className="font-normal text-pencil">Sans numéro</span>
  );
}

function day(value: string | null) {
  return value && formatDate(value);
}

const columns = helper.columns([
  helper.accessor('number', {
    header: 'N°',
    cell: (info) => <NumberCell number={info.getValue()} />,
  }),
  helper.accessor((invoice) => invoice.client.name, {
    id: 'client',
    header: 'Client',
    cell: (info) => info.getValue(),
    meta: { className: 'min-w-40 whitespace-normal' },
  }),
  helper.accessor('issueDate', {
    header: 'Date',
    cell: (info) => day(info.getValue()),
  }),
  helper.accessor('dueDate', {
    header: 'Échéance',
    cell: (info) => (
      <span className={info.row.original.late ? 'text-red' : undefined}>
        {day(info.getValue())}
      </span>
    ),
  }),
  helper.accessor('totalTtcCentimes', {
    header: 'TTC (MAD)',
    cell: (info) => formatMoney(info.getValue()),
    meta: { align: 'end' },
  }),
  helper.accessor('status', {
    header: 'Statut',
    cell: (info) => <InvoiceStamp invoice={info.row.original} />,
  }),
]);

function card(invoice: InvoiceRow): CardLines {
  return {
    title: <NumberCell number={invoice.number} />,
    titleEnd: formatMoney(invoice.totalTtcCentimes),
    detail: [invoice.client.name, day(invoice.issueDate)]
      .filter(Boolean)
      .join(' · '),
    detailEnd: <InvoiceStamp invoice={invoice} />,
  };
}

const EMPTY_TABS: Record<string, string> = {
  draft: 'Aucun brouillon de facture',
  sent: 'Aucune facture en attente de paiement',
  late: 'Aucune facture en retard',
  paid: 'Aucune facture payée',
  cancelled: 'Aucune facture annulée',
};

export function InvoiceList({
  invoices,
  params,
}: {
  invoices: InvoiceRow[];
  params: ListParams;
}) {
  const router = useRouter();

  if (invoices.length === 0) {
    if (!params.status && !params.client) {
      return (
        <EmptyState
          title="Aucune facture pour l'instant."
          action={
            <NewDocumentLink href="/invoices/new">
              Nouvelle facture
            </NewDocumentLink>
          }
        >
          {
            "Une facture reçoit son numéro quand vous l'envoyez. Un devis accepté se convertit aussi en facture."
          }
        </EmptyState>
      );
    }
    const tab =
      (params.status && EMPTY_TABS[params.status]) || 'Aucune facture';
    return (
      <EmptyState
        title={`${tab}${params.client ? ' pour ce client' : ''}.`}
        action={
          <Link href="/invoices" className="link text-label">
            Voir toutes les factures
          </Link>
        }
      />
    );
  }

  return (
    <DataTable
      label="Factures"
      columns={columns}
      data={invoices}
      onOpen={(invoice) => router.push(`/invoices/${invoice.id}`)}
      card={card}
    />
  );
}

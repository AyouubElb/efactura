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
import { dayInMorocco } from '@/lib/format';
import type { ListParams } from '@/lib/list-params';
import { purchaseLook } from './purchases.labels';
import type { PurchaseRow } from './purchases.types';

const helper = createColumnHelper<ListFeatures, PurchaseRow>();

function PurchaseStamp({ purchase }: { purchase: PurchaseRow }) {
  const look = purchaseLook(purchase.status);
  return <Stamp tone={look.tone}>{look.label}</Stamp>;
}

// Before the read ends there is no supplier yet
function supplierText(purchase: PurchaseRow): string {
  if (purchase.supplierName) {
    return purchase.supplierName;
  }
  return purchase.status === 'reading' || purchase.status === 'uploaded'
    ? 'Lecture en cours…'
    : 'Fournisseur non lu';
}

function NumberCell({ number }: { number: string | null }) {
  return number ? <span className="ref">{number}</span> : null;
}

function money(centimes: number | null) {
  return centimes === null ? null : formatMoney(centimes);
}

const columns = helper.columns([
  helper.accessor(supplierText, {
    id: 'supplier',
    header: 'Fournisseur',
    cell: (info) => info.getValue(),
    meta: { className: 'min-w-40 whitespace-normal' },
  }),
  helper.accessor('invoiceNumber', {
    header: 'N° de facture',
    cell: (info) => <NumberCell number={info.getValue()} />,
  }),
  helper.accessor('invoiceDate', {
    header: 'Date',
    cell: (info) => {
      const day = info.getValue();
      return day && formatDate(day);
    },
  }),
  helper.accessor('totalTtcCentimes', {
    header: 'TTC (MAD)',
    cell: (info) => money(info.getValue()),
    meta: { align: 'end' },
  }),
  helper.accessor('status', {
    header: 'Statut',
    cell: (info) => <PurchaseStamp purchase={info.row.original} />,
  }),
  helper.accessor('createdAt', {
    header: 'Importé le',
    cell: (info) => dayInMorocco(info.getValue()),
  }),
]);

function card(purchase: PurchaseRow): CardLines {
  return {
    title: supplierText(purchase),
    titleEnd: money(purchase.totalTtcCentimes),
    detail: [
      purchase.invoiceNumber,
      purchase.invoiceDate && formatDate(purchase.invoiceDate),
    ]
      .filter(Boolean)
      .join(' · '),
    detailEnd: <PurchaseStamp purchase={purchase} />,
  };
}

const EMPTY_TABS: Record<string, string> = {
  ready: 'Aucun achat à vérifier',
  reading: 'Aucune lecture en cours',
  confirmed: 'Aucun achat validé',
  failed: 'Aucun échec de lecture',
  discarded: 'Aucun achat écarté',
};

export function PurchaseList({
  purchases,
  params,
}: {
  purchases: PurchaseRow[];
  params: ListParams;
}) {
  const router = useRouter();

  if (purchases.length === 0) {
    if (!params.status) {
      return (
        <EmptyState
          title="Aucun achat pour l'instant."
          action={
            <NewDocumentLink href="/purchases/new">
              Importer une facture
            </NewDocumentLink>
          }
        >
          {
            "Importez la facture d'un fournisseur, en PDF ou en photo : l'IA la lit, vous vérifiez, puis vous validez."
          }
        </EmptyState>
      );
    }
    return (
      <EmptyState
        title={`${EMPTY_TABS[params.status] ?? 'Aucun achat'}.`}
        action={
          <Link href="/purchases" className="link text-label">
            Voir tous les achats
          </Link>
        }
      />
    );
  }

  return (
    <DataTable
      label="Achats"
      columns={columns}
      data={purchases}
      onOpen={(purchase) => router.push(`/purchases/${purchase.id}`)}
      card={card}
    />
  );
}

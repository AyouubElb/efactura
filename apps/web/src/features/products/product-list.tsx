'use client';

import Link from 'next/link';
import { createColumnHelper } from '@tanstack/react-table';
import { formatMoney, formatRate } from '@efactura/shared';
import {
  DataTable,
  type CardLines,
  type ListFeatures,
  type RowActions,
} from '@/components/data-table';
import { EmptyState } from '@/components/empty-state';
import { NewRecordButton, usePanel } from '@/components/record-panel';
import { useArchive } from '@/components/use-archive';
import { listHref, type ListParams } from '@/lib/list-params';
import { setProductArchived } from './products.actions';
import type { Product } from './products.types';

const helper = createColumnHelper<ListFeatures, Product>();

function money(centimes: number | null) {
  return centimes === null ? null : formatMoney(centimes);
}

const columns = helper.columns([
  helper.accessor('name', {
    header: 'Produit',
    cell: (info) => info.getValue(),
    meta: { className: 'min-w-48 whitespace-normal' },
  }),
  helper.accessor('reference', {
    header: 'Référence',
    cell: (info) => {
      const reference = info.getValue();
      return reference && <span className="ref">{reference}</span>;
    },
  }),
  helper.accessor('priceHtCentimes', {
    header: 'Prix HT',
    cell: (info) => formatMoney(info.getValue()),
    meta: { align: 'end' },
  }),
  helper.accessor('priceTtcCentimes', {
    header: 'TTC',
    cell: (info) => formatMoney(info.getValue()),
    meta: { align: 'end' },
  }),
  helper.accessor('tvaRateBp', {
    header: 'TVA',
    cell: (info) => formatRate(info.getValue()),
    meta: { align: 'end' },
  }),
  helper.accessor('lastCostHtCentimes', {
    header: 'Dernier coût',
    cell: (info) => money(info.getValue()),
    meta: { align: 'end', className: 'hidden xl:table-cell' },
  }),
  helper.accessor('earningHtCentimes', {
    header: 'Marge HT',
    cell: (info) => {
      const earning = info.getValue();
      return (
        earning !== null && (
          <span className={earning < 0 ? 'text-red' : undefined}>
            {formatMoney(earning)}
          </span>
        )
      );
    },
    meta: { align: 'end', className: 'hidden xl:table-cell' },
  }),
]);

function card(product: Product): CardLines {
  return {
    title: product.name,
    titleEnd: <span>{formatMoney(product.priceHtCentimes)} HT</span>,
    detail: product.reference && (
      <span className="ref">{product.reference}</span>
    ),
    detailEnd: `${formatMoney(product.priceTtcCentimes)} TTC`,
  };
}

export function ProductList({
  products,
  pathname,
  params,
}: {
  products: Product[];
  pathname: string;
  params: ListParams;
}) {
  const { openEdit } = usePanel<Product>();
  const archive = useArchive(setProductArchived, 'Produit');

  function actions(product: Product): RowActions {
    return {
      label: `Actions pour ${product.name}`,
      items: [
        { label: 'Modifier', onSelect: () => openEdit(product) },
        params.archived
          ? { label: 'Restaurer', onSelect: () => archive(product.id, false) }
          : { label: 'Archiver', onSelect: () => archive(product.id, true) },
      ],
    };
  }

  if (products.length === 0) {
    if (params.search) {
      return (
        <EmptyState
          title={`Aucun produit ne correspond à « ${params.search} ».`}
          action={
            <Link
              href={listHref(pathname, { ...params, search: '', page: 1 })}
              className="link text-label"
            >
              Effacer la recherche
            </Link>
          }
        />
      );
    }
    if (params.archived) {
      return (
        <EmptyState title="Aucun produit archivé.">
          Un produit archivé ne se propose plus dans les devis et les factures.
          Les documents qui le citent le gardent.
        </EmptyState>
      );
    }
    return (
      <EmptyState
        title="Aucun produit pour l'instant."
        action={<NewRecordButton>Nouveau produit</NewRecordButton>}
      >
        {
          'Ajoutez ce que vous vendez : le prix HT et le taux de TVA, le TTC suit.'
        }
      </EmptyState>
    );
  }

  return (
    <DataTable
      label="Produits"
      columns={columns}
      data={products}
      onOpen={openEdit}
      actions={actions}
      card={card}
    />
  );
}

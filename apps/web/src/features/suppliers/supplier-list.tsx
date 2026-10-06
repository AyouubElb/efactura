'use client';

import Link from 'next/link';
import { createColumnHelper } from '@tanstack/react-table';
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
import { setSupplierArchived } from './suppliers.actions';
import type { Supplier } from './suppliers.types';

const helper = createColumnHelper<ListFeatures, Supplier>();

function ice(value: string | null) {
  return value && <span className="ref">{value}</span>;
}

const columns = helper.columns([
  helper.accessor('name', {
    header: 'Fournisseur',
    cell: (info) => info.getValue(),
    meta: { className: 'min-w-48 whitespace-normal' },
  }),
  helper.accessor('ice', {
    header: 'ICE',
    cell: (info) => ice(info.getValue()),
  }),
  helper.accessor('city', { header: 'Ville', cell: (info) => info.getValue() }),
  helper.accessor('phone', {
    header: 'Téléphone',
    cell: (info) => info.getValue(),
  }),
]);

function card(supplier: Supplier): CardLines {
  return {
    title: supplier.name,
    detail: ice(supplier.ice),
    detailEnd: supplier.city,
  };
}

export function SupplierList({
  suppliers,
  pathname,
  params,
}: {
  suppliers: Supplier[];
  pathname: string;
  params: ListParams;
}) {
  const { openEdit } = usePanel<Supplier>();
  const archive = useArchive(setSupplierArchived, 'Fournisseur');

  function actions(supplier: Supplier): RowActions {
    return {
      label: `Actions pour ${supplier.name}`,
      items: [
        { label: 'Modifier', onSelect: () => openEdit(supplier) },
        params.archived
          ? { label: 'Restaurer', onSelect: () => archive(supplier.id, false) }
          : { label: 'Archiver', onSelect: () => archive(supplier.id, true) },
      ],
    };
  }

  if (suppliers.length === 0) {
    if (params.search) {
      return (
        <EmptyState
          title={`Aucun fournisseur ne correspond à « ${params.search} ».`}
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
      return <EmptyState title="Aucun fournisseur archivé." />;
    }
    return (
      <EmptyState
        title="Aucun fournisseur pour l'instant."
        action={<NewRecordButton>Nouveau fournisseur</NewRecordButton>}
      >
        Ils s&apos;ajoutent aussi quand vous validez un achat.
      </EmptyState>
    );
  }

  return (
    <DataTable
      label="Fournisseurs"
      columns={columns}
      data={suppliers}
      onOpen={openEdit}
      actions={actions}
      card={card}
    />
  );
}

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
import { setClientArchived } from './clients.actions';
import type { Client } from './clients.types';

const helper = createColumnHelper<ListFeatures, Client>();

function iceCell(client: Client) {
  return client.type === 'individual' ? (
    <span className="text-pencil">Particulier</span>
  ) : (
    <span className="ref">{client.ice}</span>
  );
}

function delay(days: number): string {
  return days === 0 ? 'Comptant' : `${days} j`;
}

const columns = helper.columns([
  helper.accessor('name', {
    header: 'Client',
    cell: (info) => info.getValue(),
    meta: { className: 'min-w-48 whitespace-normal' },
  }),
  helper.accessor('ice', {
    header: 'ICE',
    cell: (info) => iceCell(info.row.original),
  }),
  helper.accessor('city', { header: 'Ville', cell: (info) => info.getValue() }),
  helper.accessor('paymentDays', {
    header: 'Délai',
    cell: (info) => delay(info.getValue()),
    meta: { align: 'end' },
  }),
  helper.accessor('phone', {
    header: 'Téléphone',
    cell: (info) => info.getValue(),
    meta: { className: 'hidden xl:table-cell' },
  }),
]);

function card(client: Client): CardLines {
  return {
    title: client.name,
    titleEnd: delay(client.paymentDays),
    detail: iceCell(client),
    detailEnd: client.city,
  };
}

export function ClientList({
  clients,
  pathname,
  params,
}: {
  clients: Client[];
  pathname: string;
  params: ListParams;
}) {
  const { openEdit } = usePanel<Client>();
  const archive = useArchive(setClientArchived, 'Client');

  function actions(client: Client): RowActions {
    return {
      label: `Actions pour ${client.name}`,
      items: [
        { label: 'Modifier', onSelect: () => openEdit(client) },
        params.archived
          ? { label: 'Restaurer', onSelect: () => archive(client.id, false) }
          : { label: 'Archiver', onSelect: () => archive(client.id, true) },
      ],
    };
  }

  if (clients.length === 0) {
    if (params.search) {
      return (
        <EmptyState
          title={`Aucun client ne correspond à « ${params.search} ».`}
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
        <EmptyState title="Aucun client archivé.">
          Un client archivé ne se propose plus dans les devis et les factures.
          Ses documents déjà envoyés gardent son nom et son adresse.
        </EmptyState>
      );
    }
    return (
      <EmptyState
        title="Aucun client pour l'instant."
        action={<NewRecordButton>Nouveau client</NewRecordButton>}
      >
        Ajoutez une entreprise avec son ICE, ou un particulier.
      </EmptyState>
    );
  }

  return (
    <DataTable
      label="Clients"
      columns={columns}
      data={clients}
      onOpen={openEdit}
      actions={actions}
      card={card}
    />
  );
}

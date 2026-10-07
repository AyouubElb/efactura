'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CaretDownIcon, CircleNotchIcon, XIcon } from '@phosphor-icons/react';
import { Picker } from '@/components/picker';
import { Button } from '@/components/ui/button';
import type { Client } from '@/features/clients/clients.types';
import { listHref, type ListParams } from '@/lib/list-params';

// The list's client, kept in the address like its tab
export function ClientFilter({
  pathname,
  params,
  clientName,
}: {
  pathname: string;
  params: ListParams;
  clientName: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function show(client: string | undefined) {
    startTransition(() => {
      router.replace(listHref(pathname, { ...params, client, page: 1 }), {
        scroll: false,
      });
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      <Picker<Client>
        list="clients"
        open={open}
        onOpenChange={setOpen}
        label="Clients"
        placeholder="Rechercher un nom ou un ICE"
        noMatch={(text) =>
          text
            ? `Aucun client ne correspond à « ${text} ».`
            : "Aucun client pour l'instant."
        }
        renderItem={(client) => (
          <span className="grid min-w-0 flex-1 gap-0.5">
            <span className="truncate font-semibold">{client.name}</span>
            <span className="truncate text-xs text-pencil">
              {client.ice ? (
                <span className="ref">{client.ice}</span>
              ) : (
                'Particulier'
              )}
              {client.city && ` · ${client.city}`}
            </span>
          </span>
        )}
        onPick={(client) => show(client.id)}
        trigger={
          <Button variant="secondary" size="sm" className="max-w-full">
            <span className="truncate">
              Client{' '}: {clientName ?? 'tous les clients'}
            </span>
            {pending ? (
              <CircleNotchIcon aria-hidden className="animate-spin" />
            ) : (
              <CaretDownIcon aria-hidden />
            )}
          </Button>
        }
      />
      {clientName && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Voir tous les clients"
          onClick={() => show(undefined)}
        >
          <XIcon />
        </Button>
      )}
    </div>
  );
}

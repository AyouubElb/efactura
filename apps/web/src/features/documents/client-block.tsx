'use client';

import { useState } from 'react';
import { CaretDownIcon } from '@phosphor-icons/react';
import type { UseFormReturn } from 'react-hook-form';
import { Picker } from '@/components/picker';
import { Button } from '@/components/ui/button';
import { Field, FieldError } from '@/components/ui/field';
import type { Client } from '@/features/clients/clients.types';
import { cn } from '@/lib/utils';
import type { DraftInput } from './documents.schemas';
import type { DocumentKind } from './documents.types';

export function paymentDaysLabel(days: number): string {
  return days === 0 ? 'Comptant' : `${days} jours`;
}

// The client's card as it is today: a sent document keeps its own copy
export function ClientBlock({
  kind,
  form,
  client,
  locked,
  onPick,
  onCreate,
  onEdit,
}: {
  kind: DocumentKind;
  form: UseFormReturn<DraftInput>;
  client: Client | null;
  // Why the client can't change: "Client du devis DV-2026-0011."
  locked: string | null;
  onPick: (client: Client) => void;
  onCreate: (name: string) => void;
  onEdit: () => void;
}) {
  const [open, setOpen] = useState(false);
  const error = form.formState.errors.clientId?.message;

  return (
    <section aria-labelledby="client-title" className="grid gap-3">
      <h2 id="client-title" className="caps text-pencil">
        Client
      </h2>
      {locked ? (
        <p className="text-xs text-pencil">{locked}</p>
      ) : (
        <Field data-invalid={!!error} className="max-w-md">
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
            renderItem={(item) => (
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="truncate font-semibold">{item.name}</span>
                <span className="truncate text-xs text-pencil">
                  {item.ice ? (
                    <span className="ref">{item.ice}</span>
                  ) : (
                    'Particulier'
                  )}
                  {item.city && ` · ${item.city}`}
                </span>
              </span>
            )}
            onPick={onPick}
            action={(text) => ({
              label: text ? `Créer le client « ${text} »` : 'Créer un client',
              onSelect: () => onCreate(text),
            })}
            trigger={
              <button
                type="button"
                id="document-client"
                aria-label={
                  client ? `Client : ${client.name}` : 'Choisir un client'
                }
                data-invalid={!!error || undefined}
                aria-describedby={error ? 'document-client-error' : undefined}
                className={cn(
                  'flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-md border-[1.5px] border-field bg-card px-3 text-left text-base text-ink transition-[border-color,box-shadow] outline-none md:text-sm',
                  'focus-visible:border-main focus-visible:ring-3 focus-visible:ring-main-tint',
                  'data-invalid:border-red data-invalid:focus-visible:ring-red-tint',
                  !client && 'text-pencil',
                )}
              >
                <span className="truncate">
                  {client ? client.name : 'Choisir un client'}
                </span>
                <CaretDownIcon aria-hidden className="size-3.5 text-pencil" />
              </button>
            }
          />
          {error && <FieldError id="document-client-error">{error}</FieldError>}
        </Field>
      )}
      {client && (
        <ClientFacts
          kind={kind}
          client={client}
          showName={!!locked}
          onEdit={onEdit}
        />
      )}
    </section>
  );
}

function ClientFacts({
  kind,
  client,
  showName,
  onEdit,
}: {
  kind: DocumentKind;
  client: Client;
  showName: boolean;
  onEdit: () => void;
}) {
  const contact = [client.email, client.phone].filter(Boolean).join(' · ');
  return (
    <div className="grid max-w-md gap-1 rounded-md border border-line bg-card p-3 text-label">
      {showName && <span className="font-semibold">{client.name}</span>}
      <span>
        {client.ice ? (
          <span className="ref">ICE {client.ice}</span>
        ) : (
          'Particulier'
        )}
        {client.city && ` · ${client.city}`}
        {` · ${paymentDaysLabel(client.paymentDays)}`}
      </span>
      {client.address && <span className="text-pencil">{client.address}</span>}
      <span className="text-pencil">
        {contact || 'Ni e-mail ni téléphone.'}
      </span>
      {kind === 'invoice' && client.type === 'company' && !client.address && (
        <span className="text-xs text-amber">
          {
            'Adresse manquante : elle est obligatoire sur une facture à une société.'
          }
        </span>
      )}
      <Button
        type="button"
        variant="quiet"
        className="justify-self-start px-0"
        onClick={onEdit}
      >
        Modifier la fiche
      </Button>
    </div>
  );
}

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { ChoiceField } from '@/components/choice-field';
import { PanelForm, PanelSheet, usePanelSubmit } from '@/components/panel-form';
import { usePanel } from '@/components/record-panel';
import { TextField } from '@/components/text-field';
import { FieldGroup } from '@/components/ui/field';
import { saveClient } from './clients.actions';
import { clientSchema, type ClientInput } from './clients.schemas';
import type { Client } from './clients.types';

const TYPES = [
  { value: 'company', label: 'Entreprise' },
  { value: 'individual', label: 'Particulier' },
];

export function ClientPanel({
  defaultPaymentDays,
}: {
  defaultPaymentDays: number;
}) {
  const { open, record, close } = usePanel<Client>();
  return (
    <PanelSheet
      open={open}
      onClose={close}
      title={record ? record.name : 'Nouveau client'}
    >
      <ClientForm
        key={record?.id ?? 'new'}
        client={record}
        defaultPaymentDays={defaultPaymentDays}
        onSaved={close}
      />
    </PanelSheet>
  );
}

function ClientForm({
  client,
  defaultPaymentDays,
  onSaved,
}: {
  client: Client | null;
  defaultPaymentDays: number;
  onSaved: () => void;
}) {
  const form = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      type: client?.type ?? 'company',
      name: client?.name ?? '',
      ice: client?.ice ?? '',
      address: client?.address ?? '',
      city: client?.city ?? '',
      email: client?.email ?? '',
      phone: client?.phone ?? '',
      paymentDays: client ? String(client.paymentDays) : '',
    },
  });
  const type = useWatch({ control: form.control, name: 'type' });
  const { onSubmit, pending, formError } = usePanelSubmit(
    form,
    (values) => saveClient(client?.id ?? null, values),
    ({ name }) => {
      toast.success(`Client ${name} enregistré.`);
      onSaved();
    },
  );

  return (
    <PanelForm
      onSubmit={onSubmit}
      pending={pending}
      formError={formError}
      submitLabel="Enregistrer le client"
    >
      <FieldGroup>
        <ChoiceField
          control={form.control}
          name="type"
          legend="Type"
          choices={TYPES}
        />
        <TextField
          control={form.control}
          name="name"
          id="client-name"
          label={type === 'company' ? 'Raison sociale' : 'Nom et prénom'}
          autoComplete="off"
        />
        {type === 'company' && (
          <TextField
            control={form.control}
            name="ice"
            id="client-ice"
            label="ICE"
            help="15 chiffres, sur ses factures et son cachet."
            inputMode="numeric"
            autoComplete="off"
            className="font-mono"
          />
        )}
        <TextField
          control={form.control}
          name="address"
          id="client-address"
          label="Adresse"
          autoComplete="off"
        />
        <TextField
          control={form.control}
          name="city"
          id="client-city"
          label="Ville"
          autoComplete="off"
        />
        <TextField
          control={form.control}
          name="email"
          id="client-email"
          label="E-mail"
          type="email"
          inputMode="email"
          autoComplete="off"
        />
        <TextField
          control={form.control}
          name="phone"
          id="client-phone"
          label="Téléphone"
          type="tel"
          inputMode="tel"
          autoComplete="off"
        />
        <TextField
          control={form.control}
          name="paymentDays"
          id="client-days"
          label="Délai de paiement, en jours"
          help={`${defaultPaymentDays} par défaut, 120 au plus, 0 pour un paiement comptant.`}
          inputMode="numeric"
          placeholder={String(defaultPaymentDays)}
          autoComplete="off"
          className="max-w-28"
        />
      </FieldGroup>
    </PanelForm>
  );
}

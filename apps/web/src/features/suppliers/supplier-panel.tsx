'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { PanelForm, PanelSheet, usePanelSubmit } from '@/components/panel-form';
import { usePanel } from '@/components/record-panel';
import { TextField } from '@/components/text-field';
import { FieldGroup } from '@/components/ui/field';
import { saveSupplier } from './suppliers.actions';
import { supplierSchema, type SupplierInput } from './suppliers.schemas';
import type { Supplier } from './suppliers.types';

export function SupplierPanel() {
  const { open, record, close } = usePanel<Supplier>();
  return (
    <PanelSheet
      open={open}
      onClose={close}
      title={record ? record.name : 'Nouveau fournisseur'}
    >
      <SupplierForm
        key={record?.id ?? 'new'}
        supplier={record}
        onSaved={close}
      />
    </PanelSheet>
  );
}

function SupplierForm({
  supplier,
  onSaved,
}: {
  supplier: Supplier | null;
  onSaved: () => void;
}) {
  const form = useForm<SupplierInput>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: supplier?.name ?? '',
      ice: supplier?.ice ?? '',
      ifNumber: supplier?.ifNumber ?? '',
      address: supplier?.address ?? '',
      city: supplier?.city ?? '',
      phone: supplier?.phone ?? '',
      email: supplier?.email ?? '',
    },
  });
  const { onSubmit, pending, formError } = usePanelSubmit(
    form,
    (values) => saveSupplier(supplier?.id ?? null, values),
    ({ name }) => {
      toast.success(`Fournisseur ${name} enregistré.`);
      onSaved();
    },
  );

  return (
    <PanelForm
      onSubmit={onSubmit}
      pending={pending}
      formError={formError}
      submitLabel="Enregistrer le fournisseur"
    >
      <FieldGroup>
        <TextField
          control={form.control}
          name="name"
          id="supplier-name"
          label="Raison sociale"
          autoComplete="off"
        />
        <TextField
          control={form.control}
          name="ice"
          id="supplier-ice"
          label="ICE"
          help="15 chiffres. L'application reconnaît ses factures grâce à lui."
          inputMode="numeric"
          autoComplete="off"
          className="font-mono"
        />
        <TextField
          control={form.control}
          name="ifNumber"
          id="supplier-if"
          label="Identifiant fiscal"
          autoComplete="off"
          className="font-mono"
        />
        <TextField
          control={form.control}
          name="address"
          id="supplier-address"
          label="Adresse"
          autoComplete="off"
        />
        <TextField
          control={form.control}
          name="city"
          id="supplier-city"
          label="Ville"
          autoComplete="off"
        />
        <TextField
          control={form.control}
          name="phone"
          id="supplier-phone"
          label="Téléphone"
          type="tel"
          inputMode="tel"
          autoComplete="off"
        />
        <TextField
          control={form.control}
          name="email"
          id="supplier-email"
          label="E-mail"
          type="email"
          inputMode="email"
          autoComplete="off"
        />
      </FieldGroup>
    </PanelForm>
  );
}

'use client';

import { useState } from 'react';
import { useWatch, type UseFormReturn } from 'react-hook-form';
import { Picker } from '@/components/picker';
import { TextField } from '@/components/text-field';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field';
import type { SupplierOption } from '@/features/suppliers/suppliers.types';
import { withoutSpaces } from '@/lib/form-rules';
import { MatchChip } from './match-chip';
import type { ReviewInput } from './purchases.schemas';

// Recognised by its ICE, chosen by hand, or a new card made at "Valider"
export function SupplierBlock({
  form,
  card,
  onCard,
}: {
  form: UseFormReturn<ReviewInput>;
  // The chosen supplier's card, which the brouillon names only by its id
  card: SupplierOption | null;
  onCard: (card: SupplierOption) => void;
}) {
  const [picking, setPicking] = useState(false);
  const supplier = useWatch({ control: form.control, name: 'supplier' });
  const errors = form.formState.errors.supplier;
  const chosen = supplier.id !== null && card !== null ? card : null;
  const readIce = withoutSpaces(supplier.ice);

  function pick(next: SupplierOption) {
    onCard(next);
    form.setValue('supplier.id', next.id, { shouldDirty: true });
    form.clearErrors('supplier');
  }

  function choose(label: string) {
    return (
      <Picker<SupplierOption>
        list="suppliers"
        open={picking}
        onOpenChange={setPicking}
        label="Fournisseurs"
        placeholder="Rechercher un nom ou un ICE"
        noMatch={(text) =>
          text
            ? `Aucun fournisseur ne correspond à « ${text} ».`
            : "Aucun fournisseur pour l'instant."
        }
        renderItem={(option) => (
          <span className="grid min-w-0 flex-1 gap-0.5">
            <span className="truncate font-semibold">{option.name}</span>
            <span className="truncate text-xs text-pencil">
              {option.ice ? (
                <span className="ref">ICE {option.ice}</span>
              ) : (
                'Sans ICE'
              )}
              {option.city && ` · ${option.city}`}
            </span>
          </span>
        )}
        onPick={pick}
        action={
          chosen
            ? () => ({
                label: 'Nouveau fournisseur, créé à « Valider »',
                onSelect: () =>
                  form.setValue('supplier.id', null, { shouldDirty: true }),
              })
            : undefined
        }
        className="w-[min(24rem,calc(100vw-2rem))]"
        trigger={
          <Button type="button" variant="quiet" className="px-0">
            {label}
          </Button>
        }
      />
    );
  }

  return (
    <section
      aria-labelledby="supplier-title"
      className="grid gap-3 rounded-md border border-line bg-card p-4"
    >
      <h2 id="supplier-title" className="caps text-pencil">
        Fournisseur
      </h2>
      {chosen ? (
        <div className="grid gap-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold">{chosen.name}</span>
            <MatchChip>
              {chosen.ice && chosen.ice === readIce
                ? "Reconnu par l'ICE"
                : 'Choisi'}
            </MatchChip>
            {choose('Changer')}
          </div>
          <p className="text-xs text-pencil">
            {'Sur la facture : '}
            {supplier.name.trim() || 'nom illisible'}
            {readIce ? (
              <>
                , ICE <span className="ref">{readIce}</span>
              </>
            ) : (
              ', sans ICE'
            )}
          </p>
          {errors?.name && <FieldError>{errors.name.message}</FieldError>}
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <p className="text-label">
              {'Nouveau fournisseur, créé à « Valider »'}
            </p>
            {choose('Choisir un fournisseur existant')}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              control={form.control}
              name="supplier.name"
              id="supplier-name"
              label="Nom"
              autoComplete="off"
              maxLength={150}
            />
            <TextField
              control={form.control}
              name="supplier.ice"
              id="supplier-ice"
              label="ICE"
              inputMode="numeric"
              autoComplete="off"
              maxLength={20}
              className="font-mono"
              help={
                readIce ? undefined : (
                  <span className="text-amber">
                    {'ICE manquant : facture non conforme.'}
                  </span>
                )
              }
            />
            <TextField
              control={form.control}
              name="supplier.ifNumber"
              id="supplier-if"
              label="IF"
              autoComplete="off"
              maxLength={20}
              className="font-mono"
            />
            <TextField
              control={form.control}
              name="supplier.address"
              id="supplier-address"
              label="Adresse"
              autoComplete="off"
              maxLength={200}
            />
          </div>
        </div>
      )}
    </section>
  );
}

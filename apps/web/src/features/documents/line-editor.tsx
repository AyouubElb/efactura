'use client';

import { useState } from 'react';
import { PlusIcon, TrashIcon } from '@phosphor-icons/react';
import {
  amountInWords,
  computeTotals,
  formatMoney,
  formatRate,
  lineTotalHtCentimes,
  type LineInput,
} from '@efactura/shared';
import {
  Controller,
  useWatch,
  type UseFieldArrayReturn,
  type UseFormReturn,
} from 'react-hook-form';
import { Picker } from '@/components/picker';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { moneyInputValue, parseMoneyInput } from '@/lib/money-input';
import { parseQuantityInput, quantityInputValue } from '@/lib/quantity';
import { cn } from '@/lib/utils';
import { Totals } from './document-view';
import {
  MAX_LINES,
  type DraftInput,
  type DraftLineInput,
} from './documents.schemas';
import type { DocumentKind, ProductOption } from './documents.types';

const ROW =
  'grid grid-cols-2 gap-x-3 gap-y-2 lg:grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_7rem_5.5rem_6.5rem_2.25rem] lg:items-start';
const CELL_LABEL = 'caps text-pencil lg:sr-only';

type Lines = UseFieldArrayReturn<DraftInput, 'lines', 'key'>;

// "150" → "150,00", "2.5" → "2,5"; a value still wrong is left as typed
export function tidyLine(line: DraftLineInput): DraftLineInput {
  const quantity = parseQuantityInput(line.quantity);
  const price = parseMoneyInput(line.price);
  return {
    ...line,
    quantity: quantity === null ? line.quantity : quantityInputValue(quantity),
    price: price === null ? line.price : moneyInputValue(price),
  };
}

// A complete line's numbers, or null while one is still being typed
function lineNumbers(line: DraftLineInput | undefined): LineInput | null {
  if (!line) {
    return null;
  }
  const quantity = parseQuantityInput(line.quantity ?? '');
  const price = parseMoneyInput(line.price ?? '');
  const rate = Number(line.tvaRate);
  if (
    quantity === null ||
    price === null ||
    price > 1_000_000_000 ||
    !(rate >= 0) ||
    rate > 10_000
  ) {
    return null;
  }
  return { quantity, unitPriceHtCentimes: price, tvaRateBp: rate };
}

export function LineEditor({
  form,
  lines,
  tvaRatesBp,
}: {
  form: UseFormReturn<DraftInput>;
  lines: Lines;
  tvaRatesBp: number[];
}) {
  const [picking, setPicking] = useState(false);
  const watched = useWatch({ control: form.control, name: 'lines' });
  const { errors } = form.formState;
  const rootError = errors.lines?.root?.message ?? errors.lines?.message;
  const full = lines.fields.length >= MAX_LINES;
  const defaultRate = tvaRatesBp.includes(2000) ? 2000 : (tvaRatesBp[0] ?? 0);

  function addProduct(product: ProductOption) {
    lines.append(
      {
        productId: product.id,
        reference: product.reference,
        label: product.name,
        unit: product.unit,
        quantity: '1',
        price: moneyInputValue(product.priceHtCentimes),
        tvaRate: String(product.tvaRateBp),
      },
      { focusName: `lines.${lines.fields.length}.quantity` },
    );
  }

  function addFreeLine() {
    lines.append(
      {
        productId: null,
        reference: null,
        label: '',
        unit: 'pièce',
        quantity: '1',
        price: '',
        tvaRate: String(defaultRate),
      },
      { focusName: `lines.${lines.fields.length}.label` },
    );
  }

  return (
    <section aria-labelledby="lines-title" className="grid gap-3">
      <h2 id="lines-title" className="caps text-pencil">
        Lignes
      </h2>
      {lines.fields.length > 0 && (
        <div className="rounded-md border border-line bg-card">
          <div
            aria-hidden
            className={cn(
              ROW,
              'hidden caps border-b-[3px] border-double border-ink px-3 py-2.5 lg:grid',
            )}
          >
            <span>Désignation</span>
            <span className="text-right">Qté</span>
            <span>Unité</span>
            <span className="text-right">PU HT</span>
            <span>TVA</span>
            <span className="text-right">Total HT</span>
            <span />
          </div>
          <ol className="divide-y divide-line">
            {lines.fields.map((field, index) => (
              <LineRow
                key={field.key}
                form={form}
                index={index}
                line={watched?.[index]}
                tvaRatesBp={tvaRatesBp}
                onRemove={() => lines.remove(index)}
              />
            ))}
          </ol>
        </div>
      )}
      {rootError && <FieldError>{rootError}</FieldError>}
      <div className="flex flex-wrap items-center gap-2">
        <Picker<ProductOption>
          list="products"
          open={picking}
          onOpenChange={setPicking}
          label="Produits du catalogue"
          placeholder="Rechercher un nom ou une référence"
          noMatch={(text) =>
            text
              ? `Aucun produit ne correspond à « ${text} ». Une ligne libre convient à un article hors catalogue.`
              : 'Le catalogue est vide. Une ligne libre convient à un article hors catalogue.'
          }
          renderItem={(product) => (
            <span className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] gap-x-3 tabular-nums">
              <span className="truncate font-semibold">{product.name}</span>
              <span>{formatMoney(product.priceHtCentimes)}</span>
              <span className="ref truncate text-pencil">
                {product.reference ?? ' '}
              </span>
              <span className="text-xs text-pencil">HT</span>
            </span>
          )}
          onPick={addProduct}
          className="w-[min(26rem,calc(100vw-2rem))]"
          trigger={
            <Button type="button" variant="secondary" size="sm" disabled={full}>
              <PlusIcon />
              Ajouter un produit
            </Button>
          }
        />
        <Button
          type="button"
          variant="quiet"
          onClick={addFreeLine}
          disabled={full}
        >
          Ajouter une ligne libre
        </Button>
        {full && (
          <span className="text-xs text-pencil">
            Un document compte 200 lignes au plus.
          </span>
        )}
      </div>
    </section>
  );
}

function LineRow({
  form,
  index,
  line,
  tvaRatesBp,
  onRemove,
}: {
  form: UseFormReturn<DraftInput>;
  index: number;
  line: DraftLineInput | undefined;
  tvaRatesBp: number[];
  onRemove: () => void;
}) {
  const errors = form.formState.errors.lines?.[index];
  const numbers = lineNumbers(line);
  const id = (field: string) => `line-${index}-${field}`;
  const position = index + 1;
  const ownRate = Number(line?.tvaRate);
  // On leaving the field, the value reads as the document will print it
  const tidy = (field: 'quantity' | 'price') => () => {
    const current = form.getValues(`lines.${index}.${field}`);
    const next = tidyLine(form.getValues(`lines.${index}`))[field];
    if (next !== current) {
      form.setValue(`lines.${index}.${field}`, next, { shouldDirty: true });
    }
  };
  // A rate the settings dropped stays shown on the line that has it, to be changed
  const rates =
    line && !Number.isNaN(ownRate) && !tvaRatesBp.includes(ownRate)
      ? [...tvaRatesBp, ownRate]
      : tvaRatesBp;

  return (
    <li className={cn(ROW, 'px-3 py-3 lg:py-2')}>
      <div className="col-span-2 grid gap-1 lg:col-span-1">
        <label htmlFor={id('label')} className={CELL_LABEL}>
          Désignation, ligne {position}
        </label>
        <Input
          id={id('label')}
          autoComplete="off"
          aria-invalid={!!errors?.label}
          {...form.register(`lines.${index}.label`)}
        />
        {line?.reference && (
          <span className="ref px-0.5 text-pencil">{line.reference}</span>
        )}
        {errors?.label && <FieldError>{errors.label.message}</FieldError>}
      </div>
      <div className="grid gap-1">
        <label htmlFor={id('quantity')} className={CELL_LABEL}>
          Qté<span className="sr-only">, ligne {position}</span>
        </label>
        <Input
          id={id('quantity')}
          inputMode="decimal"
          autoComplete="off"
          className="text-right tabular-nums"
          aria-invalid={!!errors?.quantity}
          {...form.register(`lines.${index}.quantity`, {
            onBlur: tidy('quantity'),
          })}
        />
        {errors?.quantity && <FieldError>{errors.quantity.message}</FieldError>}
      </div>
      <div className="grid gap-1">
        <label htmlFor={id('unit')} className={CELL_LABEL}>
          Unité<span className="sr-only">, ligne {position}</span>
        </label>
        <Input
          id={id('unit')}
          autoComplete="off"
          aria-invalid={!!errors?.unit}
          {...form.register(`lines.${index}.unit`)}
        />
        {errors?.unit && <FieldError>{errors.unit.message}</FieldError>}
      </div>
      <div className="grid gap-1">
        <label htmlFor={id('price')} className={CELL_LABEL}>
          PU HT<span className="sr-only">, ligne {position}</span>
        </label>
        <Input
          id={id('price')}
          inputMode="decimal"
          autoComplete="off"
          className="text-right tabular-nums"
          aria-invalid={!!errors?.price}
          {...form.register(`lines.${index}.price`, { onBlur: tidy('price') })}
        />
        {errors?.price && <FieldError>{errors.price.message}</FieldError>}
      </div>
      <div className="grid gap-1">
        <label htmlFor={id('tva')} className={CELL_LABEL}>
          TVA<span className="sr-only">, ligne {position}</span>
        </label>
        <Controller
          control={form.control}
          name={`lines.${index}.tvaRate`}
          render={({ field, fieldState }) => (
            <Select
              name={field.name}
              value={field.value}
              onValueChange={field.onChange}
            >
              <SelectTrigger
                id={id('tva')}
                ref={field.ref}
                onBlur={field.onBlur}
                aria-invalid={fieldState.invalid}
                className="px-2"
              >
                <SelectValue placeholder="Taux" />
              </SelectTrigger>
              <SelectContent>
                {rates.map((rate) => (
                  <SelectItem key={rate} value={String(rate)}>
                    {formatRate(rate)}
                    {!tvaRatesBp.includes(rate) && ' (retiré)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {!tvaRatesBp.includes(ownRate) && line && !Number.isNaN(ownRate) && (
          <span className="text-xs text-amber">
            Ce taux n&apos;est plus proposé.
          </span>
        )}
        {errors?.tvaRate && <FieldError>{errors.tvaRate.message}</FieldError>}
      </div>
      <div className="flex items-center gap-2 lg:block lg:pt-2 lg:text-right">
        <span className={cn(CELL_LABEL, 'lg:hidden')}>Total HT</span>
        <span className="text-label tabular-nums">
          {numbers
            ? formatMoney(
                lineTotalHtCentimes(
                  numbers.quantity,
                  numbers.unitPriceHtCentimes,
                ),
              )
            : '—'}
        </span>
      </div>
      <div className="flex justify-end lg:block">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          aria-label={`Supprimer la ligne ${position}`}
        >
          <TrashIcon />
        </Button>
      </div>
    </li>
  );
}

// The editor's preview: the server computes every total again at each save
export function LiveTotals({
  form,
  kind,
  dueHint,
}: {
  form: UseFormReturn<DraftInput>;
  kind: DocumentKind;
  dueHint: string;
}) {
  const watched = useWatch({ control: form.control, name: 'lines' }) ?? [];
  const complete = watched.map(lineNumbers).filter((line) => line !== null);
  const incomplete = watched.length - complete.length;
  const totals = computeTotals(complete);

  return (
    <section
      aria-labelledby="totals-title"
      className="grid content-start gap-3 rounded-md border border-line bg-card p-4"
    >
      <h2 id="totals-title" className="caps text-pencil">
        Totaux
      </h2>
      <Totals
        totalHtCentimes={totals.totalHtCentimes}
        tvaBreakdown={totals.tvaBreakdown}
        totalTtcCentimes={totals.totalTtcCentimes}
      />
      {complete.length > 0 && (
        <p className="text-sm">
          {kind === 'quote'
            ? 'Arrêté le présent devis à la somme de :'
            : 'Arrêtée la présente facture à la somme de :'}{' '}
          <span className="font-semibold">
            {amountInWords(totals.totalTtcCentimes)} TTC.
          </span>
        </p>
      )}
      {incomplete > 0 && (
        <p className="text-xs text-amber">
          {incomplete === 1
            ? 'Une ligne incomplète ne compte pas encore.'
            : `${incomplete} lignes incomplètes ne comptent pas encore.`}
        </p>
      )}
      <p className="text-xs text-pencil">{dueHint}</p>
    </section>
  );
}

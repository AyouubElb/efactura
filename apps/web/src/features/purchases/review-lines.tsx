'use client';

import { useState } from 'react';
import { ArrowBendDownRightIcon, PlusIcon } from '@phosphor-icons/react';
import { formatMoney, formatRate } from '@efactura/shared';
import {
  Controller,
  useWatch,
  type UseFieldArrayReturn,
  type UseFormReturn,
} from 'react-hook-form';
import { MoneyInput } from '@/components/money-field';
import { Picker } from '@/components/picker';
import { TextField } from '@/components/text-field';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  moneyInputValue,
  parseMoneyInput,
  parseSignedMoneyInput,
} from '@/lib/money-input';
import { parseQuantityInput, quantityInputValue } from '@/lib/quantity';
import { cn } from '@/lib/utils';
import { unitCostHt } from './drafts';
import { MarginLine, MatchChip } from './match-chip';
import { CELL_LABEL, LINE_GRID } from './purchase-grid';
import { MATCH_LABELS, scoreText } from './purchases.labels';
import type { ReviewInput, ReviewLineInput } from './purchases.schemas';
import type { DraftProduct } from './purchases.types';

const MAX_LINES = 200;

export type KnownProduct = Pick<
  DraftProduct,
  'id' | 'name' | 'reference' | 'unit' | 'priceHtCentimes'
> & { archived?: boolean };

// A catalogue product in the picker: a suggestion carries how alike it is
type ProductChoice = KnownProduct & { score?: number };

type Lines = UseFieldArrayReturn<ReviewInput, 'lines', 'key'>;

interface LineProps {
  form: UseFormReturn<ReviewInput>;
  index: number;
  line: ReviewLineInput;
  withTax: boolean;
  tvaRatesBp: number[];
  known: Map<string, KnownProduct>;
  onKnow: (product: KnownProduct) => void;
}

function defaultRate(tvaRatesBp: number[]): number {
  return tvaRatesBp.includes(2000) ? 2000 : (tvaRatesBp[0] ?? 0);
}

// "2.5" → "2,5", "150" → "150,00"; a value still wrong is left as typed
function tidyQuantity(text: string): string {
  const quantity = parseQuantityInput(text);
  return quantity === null ? text : quantityInputValue(quantity);
}

export function tidyMoney(text: string): string {
  const centimes = parseSignedMoneyInput(text);
  return centimes === null ? text : moneyInputValue(centimes);
}

export function ReviewLines({
  form,
  lines,
  tvaRatesBp,
  known,
  onKnow,
}: {
  form: UseFormReturn<ReviewInput>;
  lines: Lines;
  tvaRatesBp: number[];
  known: Map<string, KnownProduct>;
  onKnow: (product: KnownProduct) => void;
}) {
  const watched = useWatch({ control: form.control, name: 'lines' });
  const withTax = useWatch({ control: form.control, name: 'pricesIncludeTax' });
  const errors = form.formState.errors.lines;
  const rootError = errors?.root?.message ?? errors?.message;
  const full = lines.fields.length >= MAX_LINES;

  function addLine() {
    lines.append(
      {
        label: '',
        reference: '',
        quantity: '1',
        price: '',
        total: '',
        tvaRate: String(defaultRate(tvaRatesBp)),
        productId: null,
        match: null,
        candidates: [],
        newProduct: null,
        ignored: false,
        notes: [],
      },
      { focusName: `lines.${lines.fields.length}.label` },
    );
  }

  return (
    <section aria-labelledby="lines-title" className="grid gap-3">
      <h2 id="lines-title" className="caps text-pencil">
        Lignes
      </h2>
      {lines.fields.length === 0 ? (
        <p className="rounded-md border border-line bg-card p-4 text-pencil">
          {"L'IA n'a lu aucune ligne. Ajoutez-les à partir de l'original."}
        </p>
      ) : (
        <div className="rounded-md border border-line bg-card">
          <div
            aria-hidden
            className={cn(
              LINE_GRID,
              'hidden caps border-b-[3px] border-double border-ink px-3 py-2.5 lg:grid',
            )}
          >
            <span>Ligne lue et produit</span>
            <span className="text-right">Qté</span>
            <span className="text-right">{withTax ? 'PU TTC' : 'PU HT'}</span>
            <span>TVA</span>
            <span className="text-right">
              {withTax ? 'Total TTC' : 'Total HT'}
            </span>
          </div>
          <ol className="divide-y divide-line">
            {lines.fields.map((field, index) => {
              const line = watched?.[index];
              return (
                line && (
                  <LineRow
                    key={field.key}
                    form={form}
                    index={index}
                    line={line}
                    withTax={withTax}
                    tvaRatesBp={tvaRatesBp}
                    known={known}
                    onKnow={onKnow}
                  />
                )
              );
            })}
          </ol>
        </div>
      )}
      {rootError && <FieldError>{rootError}</FieldError>}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={addLine}
          disabled={full}
        >
          <PlusIcon />
          Ajouter une ligne
        </Button>
        {full && (
          <span className="text-xs text-pencil">
            Un achat compte 200 lignes au plus.
          </span>
        )}
      </div>
    </section>
  );
}

function LineRow(props: LineProps) {
  const { form, index, line, withTax, tvaRatesBp } = props;
  const errors = form.formState.errors.lines?.[index];
  const id = (field: string) => `line-${index}-${field}`;
  const position = index + 1;
  const ownRate = line.tvaRate === '' ? null : Number(line.tvaRate);
  // A rate printed by the supplier stays offered on its line, even if the shop doesn't use it
  const rates =
    ownRate !== null && !tvaRatesBp.includes(ownRate)
      ? [...tvaRatesBp, ownRate]
      : tvaRatesBp;
  const tidy = (field: 'quantity' | 'price' | 'total') => () => {
    const name = `lines.${index}.${field}` as const;
    const current = form.getValues(name);
    const next =
      field === 'quantity' ? tidyQuantity(current) : tidyMoney(current);
    if (next !== current) {
      form.setValue(name, next, { shouldDirty: true });
    }
  };

  return (
    <li className="grid gap-2 px-3 py-3 lg:py-2.5">
      <div className={cn(LINE_GRID, line.ignored && 'opacity-60')}>
        <div className="col-span-2 grid gap-1 lg:col-span-1">
          <label htmlFor={id('label')} className={CELL_LABEL}>
            Ligne lue {position}
          </label>
          <Input
            id={id('label')}
            autoComplete="off"
            maxLength={1000}
            aria-invalid={!!errors?.label}
            className="font-mono md:text-xs"
            {...form.register(`lines.${index}.label`)}
          />
          {line.reference && (
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
            maxLength={50}
            className="text-right tabular-nums"
            aria-invalid={!!errors?.quantity}
            {...form.register(`lines.${index}.quantity`, {
              onBlur: tidy('quantity'),
            })}
          />
          {errors?.quantity && (
            <FieldError>{errors.quantity.message}</FieldError>
          )}
        </div>
        <div className="grid gap-1">
          <label htmlFor={id('price')} className={CELL_LABEL}>
            {withTax ? 'PU TTC' : 'PU HT'}
            <span className="sr-only">, ligne {position}</span>
          </label>
          <Input
            id={id('price')}
            inputMode="decimal"
            autoComplete="off"
            maxLength={50}
            className="text-right tabular-nums"
            aria-invalid={!!errors?.price}
            {...form.register(`lines.${index}.price`, {
              onBlur: tidy('price'),
            })}
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
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors?.tvaRate && <FieldError>{errors.tvaRate.message}</FieldError>}
        </div>
        <div className="grid gap-1">
          <label htmlFor={id('total')} className={CELL_LABEL}>
            {withTax ? 'Total TTC' : 'Total HT'}
            <span className="sr-only">, ligne {position}</span>
          </label>
          <Input
            id={id('total')}
            inputMode="decimal"
            autoComplete="off"
            maxLength={50}
            className="text-right tabular-nums"
            aria-invalid={!!errors?.total}
            {...form.register(`lines.${index}.total`, {
              onBlur: tidy('total'),
            })}
          />
          {errors?.total && <FieldError>{errors.total.message}</FieldError>}
        </div>
      </div>
      <ProductCell {...props} />
      {line.notes.map((note) => (
        <p key={note} className="text-xs text-amber">
          {`L'IA signale : ${note}`}
        </p>
      ))}
    </li>
  );
}

// Under the line as read: the catalogue product it becomes, and how it was found
function ProductCell({
  form,
  index,
  line,
  withTax,
  tvaRatesBp,
  known,
  onKnow,
}: LineProps) {
  const [picking, setPicking] = useState(false);
  const error = form.formState.errors.lines?.[index]?.productId?.message;
  const options = { shouldDirty: true };

  function setIgnored(ignored: boolean) {
    form.setValue(`lines.${index}.ignored`, ignored, options);
    form.clearErrors(`lines.${index}`);
  }

  function pick(product: ProductChoice) {
    onKnow({
      id: product.id,
      name: product.name,
      reference: product.reference,
      unit: product.unit,
      priceHtCentimes: product.priceHtCentimes,
      archived: product.archived ?? false,
    });
    if (product.id === line.productId) {
      return;
    }
    const suggested = line.candidates.some(
      (candidate) => candidate.productId === product.id,
    );
    form.setValue(`lines.${index}.productId`, product.id, options);
    form.setValue(
      `lines.${index}.match`,
      suggested ? 'closest_name' : 'manual',
      options,
    );
    form.setValue(`lines.${index}.newProduct`, null, options);
    form.clearErrors(`lines.${index}.productId`);
  }

  function create(name: string) {
    const rate = tvaRatesBp.includes(Number(line.tvaRate))
      ? line.tvaRate
      : String(defaultRate(tvaRatesBp));
    form.setValue(`lines.${index}.productId`, null, options);
    form.setValue(`lines.${index}.match`, 'new_product', options);
    form.setValue(
      `lines.${index}.newProduct`,
      {
        name: name.trim().slice(0, 200),
        reference: line.reference.trim().slice(0, 50),
        unit: 'pièce',
        price: '',
        tvaRate: rate,
      },
      options,
    );
    form.clearErrors(`lines.${index}.productId`);
  }

  function chooseInstead() {
    form.setValue(`lines.${index}.match`, null, options);
    form.setValue(`lines.${index}.newProduct`, null, options);
  }

  if (line.ignored) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <MatchChip tone="closed">Ignorée</MatchChip>
        <span className="text-xs text-pencil">
          {'Ligne ignorée : jamais enregistrée.'}
        </span>
        <Button
          type="button"
          variant="quiet"
          size="sm"
          className="px-0"
          onClick={() => setIgnored(false)}
        >
          Reprendre la ligne
        </Button>
      </div>
    );
  }

  const cost = unitCostHt(line.price, line.tvaRate, withTax);

  if (line.match === 'new_product' && line.newProduct) {
    return (
      <NewProductForm
        form={form}
        index={index}
        cost={cost}
        tvaRatesBp={tvaRatesBp}
        onCancel={chooseInstead}
      />
    );
  }

  const product = line.productId ? known.get(line.productId) : undefined;
  const suggestions = line.candidates.flatMap((candidate) => {
    const found = known.get(candidate.productId);
    return found ? [{ ...found, score: candidate.score }] : [];
  });
  const createName = (text: string) => (text || line.label).trim();
  const picker = (label: string) => (
    <Picker<ProductChoice>
      list="products"
      open={picking}
      onOpenChange={setPicking}
      label="Produits du catalogue"
      placeholder="Rechercher un nom ou une référence"
      suggestions={
        suggestions.length > 0
          ? { label: 'Suggestions', items: suggestions }
          : undefined
      }
      noMatch={(text) =>
        text
          ? `Aucun produit ne correspond à « ${text} ».`
          : 'Le catalogue est vide.'
      }
      renderItem={(option) => (
        <span className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 tabular-nums">
          <span className="truncate font-semibold">{option.name}</span>
          {option.score === undefined ? (
            <span>{formatMoney(option.priceHtCentimes)}</span>
          ) : (
            <MatchChip>{`Nom proche ${scoreText(option.score)}`}</MatchChip>
          )}
          <span className="ref truncate text-pencil">
            {option.reference ?? ' '}
          </span>
          <span className="text-xs text-pencil">
            {option.score === undefined
              ? 'HT'
              : `${formatMoney(option.priceHtCentimes)} HT`}
          </span>
        </span>
      )}
      onPick={pick}
      action={(text) => {
        const name = createName(text);
        return {
          label: name ? `Créer le produit « ${name} »` : 'Créer le produit',
          onSelect: () => create(name),
        };
      }}
      className="w-[min(26rem,calc(100vw-2rem))]"
      trigger={
        <Button type="button" variant="quiet" size="sm" className="px-0">
          {label}
        </Button>
      }
    />
  );

  const score = line.candidates.find(
    (candidate) => candidate.productId === line.productId,
  )?.score;
  const chip =
    line.match === 'closest_name' && score !== undefined
      ? `${MATCH_LABELS.closest_name} ${scoreText(score)}`
      : MATCH_LABELS[line.match ?? 'manual'];

  return (
    <div className="grid gap-1">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <ArrowBendDownRightIcon aria-hidden className="size-3.5 text-pencil" />
        {product ? (
          <>
            <span className="font-semibold">{product.name}</span>
            <MatchChip>{chip}</MatchChip>
          </>
        ) : (
          <MatchChip tone="todo">À choisir</MatchChip>
        )}
        {picker(product ? 'Changer' : 'Choisir un produit')}
        {!product && (
          <Button
            type="button"
            variant="quiet"
            size="sm"
            className="px-0"
            onClick={() => create(createName(''))}
          >
            Créer le produit
          </Button>
        )}
        <Button
          type="button"
          variant="quiet"
          size="sm"
          className="px-0"
          onClick={() => setIgnored(true)}
        >
          Ignorer la ligne
        </Button>
      </div>
      {product && cost !== null && (
        <MarginLine
          sellingHtCentimes={product.priceHtCentimes}
          costHtCentimes={cost}
          unit={product.unit}
        />
      )}
      {error ? (
        <FieldError>{error}</FieldError>
      ) : (
        product?.archived && (
          <p className="text-xs text-red">
            {'Produit archivé : choisissez-en un autre.'}
          </p>
        )
      )}
    </div>
  );
}

// "Créer le produit": its card, made at "Valider" with the selling price typed here
function NewProductForm({
  form,
  index,
  cost,
  tvaRatesBp,
  onCancel,
}: {
  form: UseFormReturn<ReviewInput>;
  index: number;
  cost: number | null;
  tvaRatesBp: number[];
  onCancel: () => void;
}) {
  const product = useWatch({
    control: form.control,
    name: `lines.${index}.newProduct`,
  });
  const errors = form.formState.errors.lines?.[index]?.newProduct;
  const id = (field: string) => `line-${index}-new-${field}`;
  const selling = product ? parseMoneyInput(product.price) : null;

  return (
    <div className="grid gap-3 rounded-md border border-dashed border-field p-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="flex flex-wrap items-center gap-2">
          <MatchChip>Nouveau produit</MatchChip>
          <span className="text-xs text-pencil">{'créé à « Valider »'}</span>
        </span>
        <Button
          type="button"
          variant="quiet"
          size="sm"
          className="px-0"
          onClick={onCancel}
        >
          Choisir un produit à la place
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_9rem_6rem]">
        <TextField
          control={form.control}
          name={`lines.${index}.newProduct.name`}
          id={id('name')}
          label="Nom"
          autoComplete="off"
          maxLength={200}
        />
        <TextField
          control={form.control}
          name={`lines.${index}.newProduct.reference`}
          id={id('reference')}
          label="Référence"
          autoComplete="off"
          maxLength={50}
          className="font-mono"
        />
        <TextField
          control={form.control}
          name={`lines.${index}.newProduct.unit`}
          id={id('unit')}
          label="Unité"
          autoComplete="off"
          maxLength={20}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[12rem_7rem_minmax(0,1fr)] xl:items-start">
        <Field data-invalid={!!errors?.price}>
          <FieldLabel htmlFor={id('price')}>Prix de vente HT</FieldLabel>
          <MoneyInput
            id={id('price')}
            maxLength={50}
            aria-invalid={!!errors?.price}
            {...form.register(`lines.${index}.newProduct.price`, {
              onBlur: () => {
                const name = `lines.${index}.newProduct.price` as const;
                const current = form.getValues(name);
                const next = tidyMoney(current);
                if (next !== current) {
                  form.setValue(name, next, { shouldDirty: true });
                }
              },
            })}
          />
          {errors?.price && <FieldError>{errors.price.message}</FieldError>}
        </Field>
        <Field data-invalid={!!errors?.tvaRate}>
          <FieldLabel htmlFor={id('tva')}>TVA</FieldLabel>
          <Controller
            control={form.control}
            name={`lines.${index}.newProduct.tvaRate`}
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
                >
                  <SelectValue placeholder="Taux" />
                </SelectTrigger>
                <SelectContent>
                  {tvaRatesBp.map((rate) => (
                    <SelectItem key={rate} value={String(rate)}>
                      {formatRate(rate)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors?.tvaRate && <FieldError>{errors.tvaRate.message}</FieldError>}
        </Field>
        <div className="sm:col-span-2 xl:col-span-1 xl:pt-8">
          {selling !== null && cost !== null ? (
            <MarginLine
              sellingHtCentimes={selling}
              costHtCentimes={cost}
              unit={product?.unit.trim() || 'pièce'}
              showPrice={false}
            />
          ) : (
            <p className="text-xs text-pencil">
              {cost === null
                ? 'La marge suit le prix de la ligne.'
                : `Coût ${formatMoney(cost)} HT par ${product?.unit.trim() || 'pièce'}.`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

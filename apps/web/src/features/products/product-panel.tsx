'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { computeTotals, formatMoney, formatRate } from '@efactura/shared';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { ChoiceField } from '@/components/choice-field';
import { MoneyInput } from '@/components/money-field';
import { PanelForm, PanelSheet, usePanelSubmit } from '@/components/panel-form';
import { usePanel } from '@/components/record-panel';
import { TextField } from '@/components/text-field';
import { FieldGroup } from '@/components/ui/field';
import { dayInMorocco } from '@/lib/format';
import { moneyInputValue, parseMoneyInput } from '@/lib/money-input';
import { saveProduct } from './products.actions';
import { productSchema, type ProductInput } from './products.schemas';
import type { Product } from './products.types';

export function ProductPanel({ tvaRatesBp }: { tvaRatesBp: number[] }) {
  const { open, record, close } = usePanel<Product>();
  return (
    <PanelSheet
      open={open}
      onClose={close}
      title={record ? record.name : 'Nouveau produit'}
    >
      <ProductForm
        key={record?.id ?? 'new'}
        product={record}
        tvaRatesBp={tvaRatesBp}
        onSaved={close}
      />
    </PanelSheet>
  );
}

function ttcHelp(price: string, tvaRate: string): string {
  const centimes = parseMoneyInput(price);
  const rate = Number(tvaRate);
  if (centimes === null || centimes > 1_000_000_000 || !(rate >= 0)) {
    return "Le TTC s'affiche dès que le prix est valide.";
  }
  const { totalTtcCentimes } = computeTotals([
    { quantity: '1', unitPriceHtCentimes: centimes, tvaRateBp: rate },
  ]);
  return `TTC ${formatMoney(totalTtcCentimes)} à ${formatRate(rate)}`;
}

function ProductForm({
  product,
  tvaRatesBp,
  onSaved,
}: {
  product: Product | null;
  tvaRatesBp: number[];
  onSaved: () => void;
}) {
  // A rate the settings dropped stays offered to the products that still use it
  const rates =
    product && !tvaRatesBp.includes(product.tvaRateBp)
      ? [...tvaRatesBp, product.tvaRateBp]
      : tvaRatesBp;
  const form = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? {
          name: product.name,
          reference: product.reference ?? '',
          unit: product.unit,
          price: moneyInputValue(product.priceHtCentimes),
          tvaRate: String(product.tvaRateBp),
        }
      : {
          name: '',
          reference: '',
          unit: 'pièce',
          price: '',
          tvaRate: String(tvaRatesBp[0] ?? ''),
        },
  });
  const [price, tvaRate] = useWatch({
    control: form.control,
    name: ['price', 'tvaRate'],
  });
  const { onSubmit, pending, formError } = usePanelSubmit(
    form,
    (values) => saveProduct(product?.id ?? null, values),
    ({ name }) => {
      toast.success(`Produit ${name} enregistré.`);
      onSaved();
    },
  );

  return (
    <PanelForm
      onSubmit={onSubmit}
      pending={pending}
      formError={formError}
      submitLabel="Enregistrer le produit"
    >
      <FieldGroup>
        <TextField
          control={form.control}
          name="name"
          id="product-name"
          label="Nom"
          autoComplete="off"
        />
        <TextField
          control={form.control}
          name="reference"
          id="product-reference"
          label="Référence"
          help="Le code du modèle, par exemple SM-A556E. Facultatif."
          autoComplete="off"
          spellCheck={false}
          className="font-mono"
        />
        <TextField
          control={form.control}
          name="unit"
          id="product-unit"
          label="Unité"
          autoComplete="off"
        />
        <TextField
          control={form.control}
          name="price"
          id="product-price"
          label="Prix de vente HT"
          help={ttcHelp(price, tvaRate)}
          as={MoneyInput}
        />
        <ChoiceField
          control={form.control}
          name="tvaRate"
          legend="Taux de TVA"
          choices={rates.map((rate) => ({
            value: String(rate),
            label: formatRate(rate),
          }))}
        />
      </FieldGroup>
      {product && <WhatTheShopKnows product={product} />}
    </PanelForm>
  );
}

// The cost comes only from validated achats; the margin follows the saved price
function WhatTheShopKnows({ product }: { product: Product }) {
  const { lastCostHtCentimes, lastCostAt, lastSupplier, earningHtCentimes } =
    product;
  return (
    <section className="grid gap-1.5 rounded-md border border-line bg-card p-3 text-label">
      <h3 className="caps text-pencil">Ce que la boutique sait</h3>
      {lastCostHtCentimes === null ? (
        <p className="text-pencil">
          {
            "Pas encore acheté : la marge s'affiche après le premier achat validé."
          }
        </p>
      ) : (
        <>
          <p>
            Dernier coût {formatMoney(lastCostHtCentimes)} HT
            {lastCostAt && `, le ${dayInMorocco(lastCostAt)}`}
            {lastSupplier && `, ${lastSupplier.name}`}
          </p>
          {earningHtCentimes !== null && (
            <p className={earningHtCentimes < 0 ? 'text-red' : undefined}>
              Marge {formatMoney(earningHtCentimes)} HT par {product.unit}
            </p>
          )}
        </>
      )}
    </section>
  );
}

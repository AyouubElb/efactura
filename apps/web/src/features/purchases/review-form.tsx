'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type UseFormReturn,
} from 'react-hook-form';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DateField } from '@/components/date-field';
import { MoneyInput } from '@/components/money-field';
import { Notice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { Stamp } from '@/components/stamp';
import { SubmitButton } from '@/components/submit-button';
import { TextField } from '@/components/text-field';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { WakingBanner } from '@/components/waking-banner';
import type { HistoryEntry } from '@/features/documents/documents.types';
import { HistoryCard } from '@/features/documents/side-cards';
import type { SupplierOption } from '@/features/suppliers/suppliers.types';
import { FIX_FIELDS } from '@/lib/action-result';
import { dayInMorocco, timeInMorocco } from '@/lib/format';
import { setServerErrors } from '@/lib/forms';
import {
  confirmFacts,
  confirmTitle,
  ConfirmSummary,
  type ConfirmFacts,
} from './confirm-summary';
import { reviewInput } from './drafts';
import { OriginalViewer } from './original-viewer';
import { DiscardDialog } from './purchase-actions';
import { PurchaseGrid, PurchaseTitle } from './purchase-grid';
import { confirmPurchase, saveReview } from './purchases.actions';
import { DOCUMENT_TYPE_LABELS, NOT_AN_INVOICE } from './purchases.labels';
import { reviewSchema, type ReviewInput } from './purchases.schemas';
import type {
  DocumentType,
  DraftProduct,
  PurchaseDraft,
  Readability,
} from './purchases.types';
import { ReviewLines, tidyMoney, type KnownProduct } from './review-lines';
import { SupplierBlock } from './supplier-block';
import { useAutosave, type SaveState } from './use-autosave';

const DOCUMENT_TYPES: DocumentType[] = [
  'invoice',
  'delivery_note',
  'quote',
  'other',
];

const TOTALS = [
  { key: 'ht', label: 'Total HT' },
  { key: 'tva', label: 'TVA' },
  { key: 'ttc', label: 'Total TTC' },
] as const;

// The first problem in reading order: a field takes the focus, a line's product choice is only shown
const PROBLEMS =
  '[aria-invalid="true"], button[data-invalid="true"], [data-slot="field-error"]';

// What the AI read, every field editable; saved as the person types, written at "Valider" only
export function ReviewForm({
  id,
  createdAt,
  draft,
  products,
  supplier,
  today,
  tvaRatesBp,
  readAt,
  readability,
  fileType,
  pageCount,
  history,
}: {
  id: string;
  createdAt: string;
  draft: PurchaseDraft;
  products: DraftProduct[];
  supplier: SupplierOption | null;
  today: string;
  tvaRatesBp: number[];
  readAt: string | null;
  readability: Readability | null;
  fileType: string;
  pageCount: number | null;
  history: HistoryEntry[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [card, setCard] = useState(supplier);
  const [known, setKnown] = useState(
    () =>
      new Map<string, KnownProduct>(
        products.map((product) => [product.id, product]),
      ),
  );
  const [start] = useState(() => ({
    values: reviewInput(draft),
    schema: reviewSchema({
      today,
      tvaRatesBp,
      archived: products
        .filter((product) => product.archived)
        .map((product) => product.id),
    }),
  }));
  const [facts, setFacts] = useState<ConfirmFacts | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [jumps, setJumps] = useState(0);
  const [pending, startTransition] = useTransition();

  const form = useForm<ReviewInput>({
    resolver: zodResolver(start.schema),
    defaultValues: start.values,
    shouldFocusError: false,
  });
  const lines = useFieldArray({
    control: form.control,
    name: 'lines',
    keyName: 'key',
  });

  const save = useCallback(
    (values: ReviewInput) => saveReview(id, values),
    [id],
  );
  const reload = useCallback(() => router.refresh(), [router]);
  const autosave = useAutosave({ form, save, onClosed: reload });

  const know = useCallback((product: KnownProduct) => {
    setKnown((current) => new Map(current).set(product.id, product));
  }, []);

  useEffect(() => {
    if (jumps === 0) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      const found = formRef.current?.querySelectorAll<HTMLElement>(PROBLEMS);
      const first = [...(found ?? [])].find(
        (element) => !element.closest('header'),
      );
      first?.scrollIntoView({ block: 'center' });
      first?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [jumps]);

  // Checked here first, then saved, so the dialog validates exactly what the screen shows
  const onValidate = form.handleSubmit(
    (values) => {
      if (pending) {
        return;
      }
      setFormError(null);
      startTransition(async () => {
        if (!(await autosave.flush())) {
          return;
        }
        startTransition(() => {
          setFacts(confirmFacts(values, card?.name ?? null));
          setConfirming(true);
        });
      });
    },
    () => {
      setFormError(FIX_FIELDS);
      setJumps((count) => count + 1);
    },
  );

  async function confirm(number: string): Promise<string | null> {
    const result = await confirmPurchase(id);
    if (result.ok) {
      toast.success(`Achat ${number} validé.`);
      return null;
    }
    if (result.code === 'NOT_EDITABLE') {
      router.refresh();
    }
    if (!result.fieldErrors) {
      return result.error;
    }
    setServerErrors(form, result.fieldErrors);
    setFormError(result.error);
    setJumps((count) => count + 1);
    return null;
  }

  // The dialogs sit outside the form: React carries events up through portals
  return (
    <>
      <form
        ref={formRef}
        method="post"
        onSubmit={(event) => event.preventDefault()}
        onBlur={() => void autosave.flush()}
        noValidate
        className="grid gap-6"
      >
        <div className="grid gap-2">
          <PageHeader
            crumb="Achats"
            title={
              <ReviewTitle
                control={form.control}
                cardName={card?.name ?? null}
                createdAt={createdAt}
              />
            }
            stamp={<Stamp tone="check">À vérifier</Stamp>}
            action={
              <div className="grid gap-1 sm:justify-items-end">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setDiscarding(true)}
                  >
                    Écarter
                  </Button>
                  <SubmitButton
                    type="button"
                    onClick={onValidate}
                    pending={pending}
                    pendingLabel="Enregistrement en cours"
                  >
                    {"Valider l'achat"}
                  </SubmitButton>
                </div>
                <TodoHint control={form.control} />
                {formError && <FieldError>{formError}</FieldError>}
              </div>
            }
          />
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="text-label text-pencil">
              {readAt && `Lu par l'IA le ${dayInMorocco(readAt)}. `}
              {"Rien n'est enregistré avant « Valider »."}
            </p>
            <SaveStatus
              state={autosave.state}
              onRetry={() => void autosave.flush()}
            />
          </div>
          {pending && <WakingBanner className="max-w-2xl" />}
        </div>

        <PurchaseGrid
          original={
            <OriginalViewer id={id} fileType={fileType} pageCount={pageCount} />
          }
        >
          <DocumentNotice control={form.control} />
          {(readability === 'poor' || draft.notes.length > 0) && (
            <Notice tone="check" stamp="À vérifier">
              {readability === 'poor' &&
                'Document peu lisible : vérifiez chaque ligne. '}
              {draft.notes.length > 0 &&
                `L'IA signale : ${draft.notes.join(' ')}`}
            </Notice>
          )}
          <SupplierBlock form={form} card={card} onCard={setCard} />
          <InvoiceBlock form={form} today={today} />
          <ReviewLines
            form={form}
            lines={lines}
            tvaRatesBp={tvaRatesBp}
            known={known}
            onKnow={know}
          />
          <PrintedTotals form={form} />
          <HistoryCard entries={history} />
        </PurchaseGrid>
      </form>

      {facts && (
        <ConfirmDialog
          open={confirming}
          onOpenChange={setConfirming}
          tone="main"
          title={confirmTitle(facts)}
          keepLabel="Fermer"
          confirmLabel="Valider l'achat"
          pendingLabel="Validation en cours"
          onConfirm={() => confirm(facts.number)}
        >
          <ConfirmSummary facts={facts} />
        </ConfirmDialog>
      )}

      <DiscardDialog id={id} open={discarding} onOpenChange={setDiscarding} />
    </>
  );
}

function ReviewTitle({
  control,
  cardName,
  createdAt,
}: {
  control: Control<ReviewInput>;
  cardName: string | null;
  createdAt: string;
}) {
  const [supplierId, supplierName, number] = useWatch({
    control,
    name: ['supplier.id', 'supplier.name', 'invoiceNumber'],
  });
  return (
    <PurchaseTitle
      supplierName={(supplierId && cardName) || supplierName.trim() || null}
      number={number.trim() || null}
      createdAt={createdAt}
    />
  );
}

// "2 lignes à choisir avant de valider.", as the person chooses them
function TodoHint({ control }: { control: Control<ReviewInput> }) {
  const lines = useWatch({ control, name: 'lines' });
  const todo = lines.filter(
    (line) => !line.ignored && line.match !== 'new_product' && !line.productId,
  ).length;
  return (
    <p className="text-xs text-amber" aria-live="polite">
      {todo > 1 && `${todo} lignes à choisir avant de valider.`}
      {todo === 1 && '1 ligne à choisir avant de valider.'}
    </p>
  );
}

function SaveStatus({
  state,
  onRetry,
}: {
  state: SaveState;
  onRetry: () => void;
}) {
  return (
    <p
      className="flex flex-wrap items-center gap-x-2 text-xs text-pencil"
      aria-live="polite"
    >
      {state.kind === 'saving' && 'Enregistrement…'}
      {state.kind === 'saved' && `Enregistré à ${timeInMorocco(state.at)}`}
      {state.kind === 'failed' && (
        <>
          <span className="text-red">{state.error}</span>
          <Button
            type="button"
            variant="quiet"
            size="sm"
            className="px-0"
            onClick={onRetry}
          >
            Réessayer
          </Button>
        </>
      )}
    </p>
  );
}

// A delivery note or a quote is never validated: its type is corrected, or it is set aside
function DocumentNotice({ control }: { control: Control<ReviewInput> }) {
  const documentType = useWatch({ control, name: 'documentType' });
  if (documentType === 'invoice') {
    return null;
  }
  return (
    <Notice tone="act" stamp="Erreur">
      {`${NOT_AN_INVOICE[documentType]} Corrigez son type s'il s'agit d'une facture, sinon écartez-le.`}
    </Notice>
  );
}

function InvoiceBlock({
  form,
  today,
}: {
  form: UseFormReturn<ReviewInput>;
  today: string;
}) {
  return (
    <section
      aria-labelledby="invoice-title"
      className="grid gap-3 rounded-md border border-line bg-card p-4"
    >
      <h2 id="invoice-title" className="caps text-pencil">
        Facture
      </h2>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_minmax(0,12rem)] sm:items-start">
        <Controller
          control={form.control}
          name="documentType"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="purchase-type">Type</FieldLabel>
              <Select
                name={field.name}
                value={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger
                  id="purchase-type"
                  ref={field.ref}
                  onBlur={field.onBlur}
                  aria-invalid={fieldState.invalid}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {DOCUMENT_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <TextField
          control={form.control}
          name="invoiceNumber"
          id="purchase-number"
          label="N° de facture"
          autoComplete="off"
          maxLength={200}
          className="font-mono"
        />
        <Controller
          control={form.control}
          name="invoiceDate"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="purchase-date">Date</FieldLabel>
              <DateField
                id="purchase-date"
                label="Date de la facture"
                value={field.value}
                onChange={field.onChange}
                max={today}
                invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>
      <Controller
        control={form.control}
        name="pricesIncludeTax"
        render={({ field }) => (
          <Field orientation="horizontal" className="w-fit">
            <Switch
              id="purchase-with-tax"
              ref={field.ref}
              checked={field.value}
              onCheckedChange={field.onChange}
              onBlur={field.onBlur}
            />
            <FieldLabel htmlFor="purchase-with-tax" className="font-normal">
              Prix TTC sur la facture
            </FieldLabel>
          </Field>
        )}
      />
    </section>
  );
}

// As printed: they don't follow the lines, there is no maths check yet
function PrintedTotals({ form }: { form: UseFormReturn<ReviewInput> }) {
  return (
    <section
      aria-labelledby="totals-title"
      className="grid gap-3 rounded-md border border-line bg-card p-4"
    >
      <h2 id="totals-title" className="caps text-pencil">
        Totaux imprimés
      </h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {TOTALS.map(({ key, label }) => (
          <Controller
            key={key}
            control={form.control}
            name={`totals.${key}`}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`purchase-${key}`}>{label}</FieldLabel>
                <MoneyInput
                  {...field}
                  id={`purchase-${key}`}
                  maxLength={50}
                  aria-invalid={fieldState.invalid}
                  onBlur={() => {
                    const next = tidyMoney(field.value);
                    if (next !== field.value) {
                      field.onChange(next);
                    }
                    field.onBlur();
                  }}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        ))}
      </div>
      <p className="text-xs text-pencil">
        {'Recopiés de la facture : ils ne suivent pas les lignes.'}
      </p>
    </section>
  );
}

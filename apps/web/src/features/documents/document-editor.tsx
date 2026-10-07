'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Notice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { PanelSheet } from '@/components/panel-form';
import { Stamp } from '@/components/stamp';
import { SubmitButton } from '@/components/submit-button';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { WakingBanner } from '@/components/waking-banner';
import { ClientForm } from '@/features/clients/client-panel';
import type { Client } from '@/features/clients/clients.types';
import {
  deleteInvoice,
  saveInvoice,
  sendInvoice,
} from '@/features/invoices/invoices.actions';
import {
  deleteQuote,
  saveQuote,
  sendQuote,
} from '@/features/quotes/quotes.actions';
import { setServerErrors } from '@/lib/forms';
import { moneyInputValue } from '@/lib/money-input';
import { quantityInputValue } from '@/lib/quantity';
import { ClientBlock } from './client-block';
import { documentPath, pdfPath } from './documents.labels';
import {
  draftSchema,
  type DraftInput,
  type DraftLineInput,
} from './documents.schemas';
import type { DocumentLine, DraftStart, SendChannel } from './documents.types';
import { LineEditor, LiveTotals, tidyLine } from './line-editor';
import { SendDialog, type SendOutcome } from './send-dialog';

export interface EditorSettings {
  configured: boolean;
  tvaRatesBp: number[];
  defaultQuoteValidityDays: number;
  defaultPaymentDays: number;
}

const WORDS = {
  quote: {
    one: 'Devis',
    sent: 'envoyé',
    send: 'Envoyer le devis',
    draft: 'Brouillon de devis',
    saved: 'Brouillon de devis enregistré.',
    list: '/quotes',
  },
  invoice: {
    one: 'Facture',
    sent: 'envoyée',
    send: 'Envoyer la facture',
    draft: 'Brouillon de facture',
    saved: 'Brouillon de facture enregistré.',
    list: '/invoices',
  },
} as const;

function lineInput(line: DocumentLine): DraftLineInput {
  return {
    productId: line.productId,
    reference: line.reference,
    label: line.label,
    unit: line.unit,
    quantity: quantityInputValue(line.quantity),
    price: moneyInputValue(line.unitPriceHtCentimes),
    tvaRate: String(line.tvaRateBp),
  };
}

function dueHint(
  kind: 'quote' | 'invoice',
  client: Client | null,
  settings: EditorSettings,
): string {
  if (kind === 'quote') {
    return `Valable ${settings.defaultQuoteValidityDays} jours après l'envoi.`;
  }
  if (!client) {
    return "L'échéance suit le délai de paiement du client.";
  }
  return client.paymentDays === 0
    ? "À régler comptant, dès l'envoi."
    : `À régler sous ${client.paymentDays} jours après l'envoi.`;
}

interface PanelState {
  open: boolean;
  client: Client | null;
  name: string;
}

// A new devis or facture, or a draft: nothing is numbered before "Envoyer"
export function DocumentEditor({
  kind,
  start,
  client: startClient,
  locked,
  crumb,
  title,
  settings,
  isAdmin,
  deleteNote,
  aside,
}: {
  kind: 'quote' | 'invoice';
  start: DraftStart;
  client: Client | null;
  locked: string | null;
  crumb: string;
  title: string;
  settings: EditorSettings;
  isAdmin: boolean;
  deleteNote: string;
  aside?: React.ReactNode;
}) {
  const router = useRouter();
  const words = WORDS[kind];
  const [savedId, setSavedId] = useState(start.id);
  const [client, setClient] = useState(startClient);
  const [panel, setPanel] = useState<PanelState>({
    open: false,
    client: null,
    name: '',
  });
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'save' | 'send'>('save');
  const [pending, startTransition] = useTransition();

  const form = useForm<DraftInput>({
    resolver: zodResolver(draftSchema),
    defaultValues: {
      clientId: start.clientId ?? '',
      lines: start.lines.map(lineInput),
      notes: start.notes ?? '',
    },
  });
  const lines = useFieldArray({
    control: form.control,
    name: 'lines',
    keyName: 'key',
  });
  const { isDirty } = form.formState;

  // A reload or a closed tab asks first; links inside the app don't
  useEffect(() => {
    if (!isDirty) {
      return;
    }
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  // After the first save, the tab says what a reload would
  useEffect(() => {
    if (savedId && start.id === null) {
      document.title = document.title.replace(title, words.draft);
    }
  }, [savedId, start.id, title, words.draft]);

  async function persist(values: DraftInput): Promise<string | null> {
    const save = kind === 'quote' ? saveQuote : saveInvoice;
    const result = await save(savedId, values);
    if (!result.ok) {
      setServerErrors(form, result.fieldErrors);
      setFormError(result.error);
      return null;
    }
    form.reset({ ...values, lines: values.lines.map(tidyLine) });
    if (savedId === null) {
      setSavedId(result.data.id);
      // The draft's own address, without drawing the page again
      window.history.replaceState(null, '', documentPath(kind, result.data.id));
    }
    return result.data.id;
  }

  const onSave = form.handleSubmit((values) => {
    if (pending) {
      return;
    }
    setFormError(null);
    setBusy('save');
    startTransition(async () => {
      if (await persist(values)) {
        toast.success(words.saved);
      }
    });
  });

  // Saved first, so the dialog sends exactly what the screen shows
  const onSend = form.handleSubmit((values) => {
    if (pending) {
      return;
    }
    setFormError(null);
    setBusy('send');
    startTransition(async () => {
      const id = isDirty || savedId === null ? await persist(values) : savedId;
      if (id) {
        startTransition(() => setSending(true));
      }
    });
  });

  async function send(channel: SendChannel): Promise<SendOutcome> {
    if (!savedId) {
      return { ok: false, error: "Enregistrez d'abord le brouillon." };
    }
    const result = await (kind === 'quote' ? sendQuote : sendInvoice)(
      savedId,
      channel,
    );
    return result.ok
      ? {
          ok: true,
          title: `${words.one} ${result.data.number} ${words.sent}`,
          kind,
          id: savedId,
          delivery: result.data.delivery,
        }
      : { ok: false, error: result.error, code: result.code };
  }

  function pick(next: Client) {
    setClient(next);
    form.setValue('clientId', next.id, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  const contact = {
    phone: client?.phone ?? null,
    email: client?.email ?? null,
  };
  const sendIntro =
    kind === 'quote' ? (
      <p>
        Le devis reçoit son numéro et ne pourra plus être modifié. Il reste
        valable {settings.defaultQuoteValidityDays} jours.
      </p>
    ) : (
      <>
        <p>La facture reçoit son numéro et ne pourra plus être modifiée.</p>
        <p>
          {client?.paymentDays === 0
            ? 'Elle est à régler comptant.'
            : `Elle sera à régler sous ${client?.paymentDays ?? settings.defaultPaymentDays} jours.`}{' '}
          Une erreur se corrigera ensuite par un avoir.
        </p>
      </>
    );

  // The dialogs sit outside the form: React carries a submit up through portals
  return (
    <>
      <form method="post" onSubmit={onSave} noValidate className="grid gap-6">
        <div className="grid gap-2">
          <PageHeader
            crumb={crumb}
            title={savedId && start.id === null ? words.draft : title}
            stamp={savedId && <Stamp tone="draft">Brouillon</Stamp>}
            action={
              <div className="flex flex-wrap gap-2">
                <SubmitButton
                  variant="secondary"
                  pending={pending && busy === 'save'}
                  pendingLabel="Enregistrement en cours"
                >
                  Enregistrer le brouillon
                </SubmitButton>
                <SubmitButton
                  type="button"
                  onClick={onSend}
                  disabled={!settings.configured}
                  pending={pending && busy === 'send'}
                  pendingLabel="Enregistrement en cours"
                >
                  {words.send}
                </SubmitButton>
              </div>
            }
          />
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <p className="text-xs text-pencil" aria-live="polite">
              {isDirty && 'Modifications non enregistrées.'}
            </p>
            {savedId && (
              <div className="flex flex-wrap items-center gap-x-4">
                {settings.configured && !isDirty ? (
                  <a
                    href={pdfPath(kind, savedId)}
                    target="_blank"
                    rel="noopener"
                    className="link text-label"
                  >
                    Aperçu du PDF
                  </a>
                ) : (
                  <span className="text-label text-pencil">
                    Aperçu du PDF
                    {settings.configured && ", après l'enregistrement"}
                  </span>
                )}
                <Button
                  type="button"
                  variant="quiet"
                  className="px-0 text-red"
                  onClick={() => setDeleting(true)}
                >
                  Supprimer le brouillon
                </Button>
              </div>
            )}
          </div>
          {!settings.configured && (
            <Notice tone="check" stamp="Paramètres">
              {
                "Remplissez d'abord les paramètres de la boutique : ils s'impriment sur chaque document."
              }{' '}
              {isAdmin && (
                <Link href="/settings" className="link">
                  Ouvrir les paramètres
                </Link>
              )}
            </Notice>
          )}
          {pending && <WakingBanner className="max-w-2xl" />}
        </div>

        <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="grid min-w-0 content-start gap-6">
            <ClientBlock
              kind={kind}
              form={form}
              client={client}
              locked={locked}
              onPick={pick}
              onCreate={(name) => setPanel({ open: true, client: null, name })}
              onEdit={() => setPanel({ open: true, client, name: '' })}
            />
            <LineEditor
              form={form}
              lines={lines}
              tvaRatesBp={settings.tvaRatesBp}
            />
            <Controller
              control={form.control}
              name="notes"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="max-w-2xl">
                  <FieldLabel htmlFor="document-notes">
                    Notes imprimées sur le document
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id="document-notes"
                    maxLength={1000}
                    aria-invalid={fieldState.invalid}
                    aria-describedby="document-notes-help"
                  />
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : (
                    <FieldDescription id="document-notes-help">
                      Délai de livraison, conditions… 1 000 caractères au plus.
                    </FieldDescription>
                  )}
                </Field>
              )}
            />
            {formError && <FieldError>{formError}</FieldError>}
          </div>
          <div className="grid content-start gap-4">
            <LiveTotals
              form={form}
              kind={kind}
              dueHint={dueHint(kind, client, settings)}
            />
            {aside}
          </div>
        </div>
      </form>

      <PanelSheet
        open={panel.open}
        onClose={() => setPanel((current) => ({ ...current, open: false }))}
        title={panel.client ? panel.client.name : 'Nouveau client'}
      >
        <ClientForm
          key={panel.client?.id ?? `new-${panel.name}`}
          client={panel.client}
          initialName={panel.name}
          defaultPaymentDays={settings.defaultPaymentDays}
          refreshPage={false}
          onSaved={(saved) => {
            setPanel((current) => ({ ...current, open: false }));
            if (saved.id === client?.id) {
              setClient(saved);
            } else {
              pick(saved);
            }
          }}
        />
      </PanelSheet>

      <SendDialog
        open={sending}
        onOpenChange={setSending}
        title={words.send}
        intro={sendIntro}
        submitLabel={words.send}
        contact={contact}
        onEditClient={() => setPanel({ open: true, client, name: '' })}
        send={send}
        onDone={() => router.refresh()}
      />

      {savedId && (
        <ConfirmDialog
          open={deleting}
          onOpenChange={setDeleting}
          title={'Supprimer ce brouillon ?'}
          keepLabel="Garder le brouillon"
          confirmLabel="Oui, supprimer le brouillon"
          pendingLabel="Suppression en cours"
          onConfirm={async () => {
            const result = await (
              kind === 'quote' ? deleteQuote : deleteInvoice
            )(savedId);
            if (!result.ok) {
              return result.error;
            }
            toast.success('Brouillon supprimé.');
            router.push(words.list);
            return null;
          }}
        >
          <p>{deleteNote}</p>
        </ConfirmDialog>
      )}
    </>
  );
}

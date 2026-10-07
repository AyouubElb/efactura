'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { addDays, formatDate, todayInMorocco } from '@efactura/shared';
import { CircleNotchIcon } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DateField } from '@/components/date-field';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { WakingBanner } from '@/components/waking-banner';
import type { Client } from '@/features/clients/clients.types';
import { DownloadLink, ResendButton } from '@/features/documents/resend-button';
import { cn } from '@/lib/utils';
import {
  convertQuote,
  decideQuote,
  deliverQuote,
  extendQuote,
  reviseQuote,
} from './quotes.actions';
import type { Quote } from './quotes.types';

export function QuoteActions({
  quote,
  client,
  defaultPaymentDays,
}: {
  quote: Quote;
  client: Client;
  defaultPaymentDays: number;
}) {
  const router = useRouter();
  const [asking, setAsking] = useState<'accept' | 'refuse' | null>(null);
  const [extending, setExtending] = useState(false);
  const [working, startTransition] = useTransition();
  const number = quote.number ?? '';
  const open = quote.status === 'sent';

  // Revise and convert open the draft they make
  function goTo(
    run: () => Promise<
      { ok: true; data: { id: string } } | { ok: false; error: string }
    >,
    message: string,
    path: (id: string) => string,
  ) {
    if (working) {
      return;
    }
    const toastId = toast.loading('Préparation du brouillon');
    startTransition(async () => {
      const result = await run();
      if (result.ok) {
        toast.success(message, { id: toastId });
        router.push(path(result.data.id));
      } else {
        toast.error(result.error, { id: toastId });
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {open && (
        <>
          <Button onClick={() => setAsking('accept')}>Marquer accepté</Button>
          <Button variant="secondary" onClick={() => setAsking('refuse')}>
            Marquer refusé
          </Button>
          {quote.nextVersion ? (
            <Button asChild variant="secondary">
              <Link href={`/quotes/${quote.nextVersion.id}`}>
                Voir la version en brouillon
              </Link>
            </Button>
          ) : (
            <Button
              variant="secondary"
              aria-disabled={working || undefined}
              className={cn(working && 'pointer-events-none')}
              onClick={() =>
                goTo(
                  () => reviseQuote(quote.id),
                  `Version ${quote.version + 1} du devis en brouillon.`,
                  (id) => `/quotes/${id}`,
                )
              }
            >
              {working && (
                <CircleNotchIcon className="animate-spin" aria-hidden />
              )}
              Réviser
            </Button>
          )}
          <Button variant="secondary" onClick={() => setExtending(true)}>
            Prolonger
          </Button>
        </>
      )}
      {quote.status === 'accepted' &&
        (quote.invoice ? (
          <Button asChild variant="secondary">
            <Link href={`/invoices/${quote.invoice.id}`}>
              {quote.invoice.number
                ? `Voir la facture ${quote.invoice.number}`
                : 'Voir la facture en brouillon'}
            </Link>
          </Button>
        ) : (
          <Button
            aria-disabled={working || undefined}
            className={cn(working && 'pointer-events-none')}
            onClick={() =>
              goTo(
                () => convertQuote(quote.id),
                `Facture en brouillon créée depuis le devis ${number}.`,
                (id) => `/invoices/${id}`,
              )
            }
          >
            {working && (
              <CircleNotchIcon className="animate-spin" aria-hidden />
            )}
            {working ? 'Conversion en cours' : 'Convertir en facture'}
          </Button>
        ))}
      {(open || quote.status === 'accepted') && (
        <ResendButton
          kind="quote"
          id={quote.id}
          number={number}
          client={client}
          defaultPaymentDays={defaultPaymentDays}
          deliver={deliverQuote}
        />
      )}
      <DownloadLink kind="quote" id={quote.id} />

      <ConfirmDialog
        open={asking !== null}
        onOpenChange={(next) => !next && setAsking(null)}
        tone="main"
        title={
          asking === 'refuse'
            ? `Marquer le devis ${number} refusé ?`
            : `Marquer le devis ${number} accepté ?`
        }
        keepLabel="Fermer"
        confirmLabel={
          asking === 'refuse' ? 'Marquer refusé' : 'Marquer accepté'
        }
        pendingLabel="Enregistrement en cours"
        onConfirm={async () => {
          const decision = asking === 'refuse' ? 'refuse' : 'accept';
          const result = await decideQuote(quote.id, decision);
          if (!result.ok) {
            return result.error;
          }
          toast.success(
            `Devis ${number} marqué ${decision === 'refuse' ? 'refusé' : 'accepté'}.`,
          );
          return null;
        }}
      >
        {asking === 'refuse' ? (
          <p>
            Le devis est clos{' '}: il ne pourra plus être accepté, révisé ni
            prolongé. Ce choix ne peut pas être défait.
          </p>
        ) : (
          <p>
            Le client a donné son accord. Vous pourrez ensuite convertir le
            devis en facture. Ce choix ne peut pas être défait.
          </p>
        )}
      </ConfirmDialog>

      {open && (
        <ExtendDialog
          open={extending}
          onOpenChange={setExtending}
          id={quote.id}
          number={number}
          validUntil={quote.validUntil}
        />
      )}
    </div>
  );
}

function ExtendDialog({
  open,
  onOpenChange,
  id,
  number,
  validUntil,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: string;
  number: string;
  validUntil: string | null;
}) {
  const tomorrow = addDays(todayInMorocco(), 1);
  const [day, setDay] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close(next: boolean) {
    if (!pending && !next) {
      setDay('');
      setError(null);
      onOpenChange(false);
    }
  }

  function submit() {
    if (pending) {
      return;
    }
    if (!day) {
      setError('Choisissez la nouvelle date.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await extendQuote(id, { validUntil: day });
      startTransition(() => {
        if (result.ok) {
          toast.success(
            `Devis ${number} prolongé jusqu'au ${formatDate(day)}.`,
          );
          close(false);
        } else {
          setError(result.fieldErrors?.validUntil?.[0] ?? result.error);
        }
      });
    });
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Prolonger le devis {number}</DialogTitle>
        </DialogHeader>
        <DialogDescription className="text-sm text-ink">
          {validUntil
            ? `Il est valable jusqu'au ${formatDate(validUntil)}. `
            : ''}
          Le PDF est refait avec la nouvelle date.
        </DialogDescription>
        <Field data-invalid={!!error}>
          <FieldLabel htmlFor="extend-until">Valable jusqu&apos;au</FieldLabel>
          <DateField
            id="extend-until"
            label="Valable jusqu'au"
            value={day}
            onChange={setDay}
            min={tomorrow}
            invalid={!!error}
          />
          {error && <FieldError>{error}</FieldError>}
        </Field>
        {pending && <WakingBanner />}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={pending}>
              Fermer
            </Button>
          </DialogClose>
          <Button
            onClick={submit}
            aria-disabled={pending || undefined}
            className={cn(pending && 'pointer-events-none')}
          >
            {pending && (
              <CircleNotchIcon className="animate-spin" aria-hidden />
            )}
            {pending ? 'Enregistrement en cours' : 'Prolonger le devis'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

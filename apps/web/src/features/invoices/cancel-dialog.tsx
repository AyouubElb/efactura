'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleNotchIcon } from '@phosphor-icons/react';
import { formatMoney } from '@efactura/shared';
import { Controller, useForm } from 'react-hook-form';
import { TextField } from '@/components/text-field';
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
import {
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { WakingBanner } from '@/components/waking-banner';
import type { Client } from '@/features/clients/clients.types';
import {
  ChannelChoice,
  NextStep,
  SentStep,
  type Sent,
} from '@/features/documents/send-dialog';
import { setServerErrors } from '@/lib/forms';
import { cn } from '@/lib/utils';
import { cancelInvoice } from './invoices.actions';
import { cancelSchema, type CancelInput } from './invoices.schemas';
import type { Invoice } from './invoices.types';

export function CancelDialog({
  open,
  onOpenChange,
  invoice,
  client,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice;
  client: Client;
}) {
  const router = useRouter();
  const [sent, setSent] = useState<Sent | null>(null);
  const [error, setError] = useState<{ message: string; code?: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  // The avoir has its number, only its delivery failed
  const numbered = error?.code === 'DELIVERY_FAILED';
  const form = useForm<CancelInput>({
    resolver: zodResolver(cancelSchema),
    defaultValues: { reason: '', channel: 'whatsapp' },
  });

  function changeOpen(next: boolean) {
    if (pending || next) {
      return;
    }
    const changed = sent !== null || numbered;
    onOpenChange(false);
    setSent(null);
    setError(null);
    form.reset();
    if (changed) {
      router.refresh();
    }
  }

  const onSubmit = form.handleSubmit((values) => {
    if (pending) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await cancelInvoice(invoice.id, values);
      startTransition(() => {
        if (result.ok) {
          setSent({
            ok: true,
            title: `Avoir ${result.data.number} créé`,
            kind: 'credit_note',
            id: result.data.creditNoteId,
            delivery: result.data.delivery,
          });
        } else {
          setServerErrors(form, result.fieldErrors);
          setError({ message: result.error, code: result.code });
        }
      });
    });
  });

  const redo = `/invoices/new?from=${invoice.id}`;

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent showCloseButton={false}>
        {sent ? (
          <>
            <SentStep sent={sent} />
            <p className="text-sm">
              Il annule la facture <span className="ref">{invoice.number}</span>
              . Faites maintenant la facture corrigée.
            </p>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary">Fermer</Button>
              </DialogClose>
              <Button asChild variant="secondary">
                <Link href={redo}>Refaire la facture</Link>
              </Button>
              <NextStep sent={sent} />
            </DialogFooter>
          </>
        ) : (
          <form
            method="post"
            onSubmit={onSubmit}
            noValidate
            className="grid gap-3"
          >
            <DialogHeader>
              <DialogTitle>
                Annuler la facture {invoice.number}
                {' '}?
              </DialogTitle>
            </DialogHeader>
            <DialogDescription asChild className="grid gap-2 text-sm text-ink">
              <div>
                <p>
                  Un avoir de {formatMoney(-invoice.totalTtcCentimes)} MAD est
                  créé et transmis au client. La facture reste dans vos
                  documents, marquée «{' '}Annulée{' '}».
                </p>
                <p>Cette action ne peut pas être défaite.</p>
              </div>
            </DialogDescription>
            {!numbered && (
              <FieldGroup>
                <TextField
                  control={form.control}
                  name="reason"
                  id="cancel-reason"
                  label="Motif, imprimé sur l'avoir"
                  autoComplete="off"
                  maxLength={200}
                />
                <Controller
                  control={form.control}
                  name="channel"
                  render={({ field }) => (
                    <FieldSet className="gap-2">
                      <FieldLegend variant="label" className="mb-0">
                        Transmettre l&apos;avoir par
                      </FieldLegend>
                      <ChannelChoice
                        value={field.value}
                        onChange={field.onChange}
                        contact={{ phone: client.phone, email: client.email }}
                        legend="Transmettre l'avoir par"
                      />
                    </FieldSet>
                  )}
                />
              </FieldGroup>
            )}
            {error && <FieldError>{error.message}</FieldError>}
            {pending && <WakingBanner />}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary" disabled={pending}>
                  {numbered ? 'Fermer' : 'Garder la facture'}
                </Button>
              </DialogClose>
              {!numbered && (
                <Button
                  type="submit"
                  variant="dangerFill"
                  aria-disabled={pending || undefined}
                  className={cn(pending && 'pointer-events-none')}
                >
                  {pending && (
                    <CircleNotchIcon className="animate-spin" aria-hidden />
                  )}
                  {pending ? 'Annulation en cours' : 'Oui, annuler la facture'}
                </Button>
              )}
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

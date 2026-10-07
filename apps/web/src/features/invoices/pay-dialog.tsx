'use client';

import { useState, useTransition } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { formatMoney, todayInMorocco } from '@efactura/shared';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ChoiceField } from '@/components/choice-field';
import { DateField } from '@/components/date-field';
import { SubmitButton } from '@/components/submit-button';
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
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { WakingBanner } from '@/components/waking-banner';
import { PAYMENT_LABELS } from '@/features/documents/documents.labels';
import { setServerErrors } from '@/lib/forms';
import { payInvoice } from './invoices.actions';
import { paySchema, type PayInput } from './invoices.schemas';
import type { Invoice } from './invoices.types';

const METHODS = Object.entries(PAYMENT_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export function PayDialog({
  open,
  onOpenChange,
  invoice,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        {open && (
          <PayForm invoice={invoice} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PayForm({
  invoice,
  onDone,
}: {
  invoice: Invoice;
  onDone: () => void;
}) {
  const today = todayInMorocco();
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<PayInput>({
    resolver: zodResolver(paySchema),
    defaultValues: { paidOn: today, method: '', reference: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    if (pending) {
      return;
    }
    setFormError(null);
    startTransition(async () => {
      const result = await payInvoice(invoice.id, values);
      startTransition(() => {
        if (result.ok) {
          toast.success(`Facture ${invoice.number} marquée payée.`);
          onDone();
        } else {
          setServerErrors(form, result.fieldErrors);
          setFormError(result.error);
        }
      });
    });
  });

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="grid gap-3">
      <DialogHeader>
        <DialogTitle>Marquer payée</DialogTitle>
      </DialogHeader>
      <DialogDescription>
        <span className="ref">{invoice.number}</span>,{' '}
        {invoice.clientSnapshot?.name ?? invoice.client.name},{' '}
        {formatMoney(invoice.totalTtcCentimes)} MAD
      </DialogDescription>
      <FieldGroup>
        <Controller
          control={form.control}
          name="paidOn"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="pay-date">Date du paiement</FieldLabel>
              <DateField
                id="pay-date"
                label="Date du paiement"
                value={field.value}
                onChange={field.onChange}
                min={invoice.issueDate ?? undefined}
                max={today}
                invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <ChoiceField
          control={form.control}
          name="method"
          legend="Mode de paiement"
          choices={METHODS}
        />
        <TextField
          control={form.control}
          name="reference"
          id="pay-reference"
          label="Référence, facultative"
          help="Le numéro du chèque, du virement ou de l'effet."
          autoComplete="off"
          maxLength={100}
        />
      </FieldGroup>
      {formError && <FieldError>{formError}</FieldError>}
      {pending && <WakingBanner />}
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="secondary" disabled={pending}>
            Fermer
          </Button>
        </DialogClose>
        <SubmitButton pending={pending} pendingLabel="Enregistrement en cours">
          Marquer payée
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}

'use client';

import { useState, useTransition } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';
import { SubmitButton } from '@/components/submit-button';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { WakingBanner } from '@/components/waking-banner';
import type { ActionFailure } from '@/lib/action-result';
import { setServerErrors } from '@/lib/forms';

export function PanelSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}

export function usePanelSubmit<TValues extends FieldValues, TData>(
  form: UseFormReturn<TValues>,
  save: (values: TValues) => Promise<{ ok: true; data: TData } | ActionFailure>,
  onSaved: (data: TData) => void,
) {
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = form.handleSubmit((values) => {
    if (pending) {
      return;
    }
    setFormError(null);
    startTransition(async () => {
      const result = await save(values);
      if (!result.ok) {
        setServerErrors(form, result.fieldErrors);
        setFormError(result.error);
        return;
      }
      onSaved(result.data);
    });
  });

  return { onSubmit, pending, formError };
}

export function PanelForm({
  onSubmit,
  pending,
  formError,
  submitLabel,
  pendingLabel = 'Enregistrement en cours',
  children,
}: {
  onSubmit: React.SubmitEventHandler<HTMLFormElement>;
  pending: boolean;
  formError: string | null;
  submitLabel: string;
  pendingLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <form
      method="post"
      onSubmit={onSubmit}
      noValidate
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="grid flex-1 content-start gap-4 overflow-y-auto p-4">
        {children}
        {formError && <FieldError>{formError}</FieldError>}
        {pending && <WakingBanner />}
      </div>
      <SheetFooter>
        <SheetClose asChild>
          <Button type="button" variant="secondary">
            Fermer
          </Button>
        </SheetClose>
        <SubmitButton pending={pending} pendingLabel={pendingLabel}>
          {submitLabel}
        </SubmitButton>
      </SheetFooter>
    </form>
  );
}

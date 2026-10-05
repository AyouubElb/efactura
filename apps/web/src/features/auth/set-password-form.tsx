'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { SubmitButton } from '@/components/submit-button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { WakingBanner } from '@/components/waking-banner';
import type { ActionResult } from '@/lib/action-result';
import { setServerErrors } from '@/lib/forms';
import { acceptInvite, resetPassword } from './auth.actions';
import { setPasswordSchema, type SetPasswordInput } from './auth.schemas';

const ACTIONS: Record<
  'invite' | 'reset',
  (token: string, input: SetPasswordInput) => Promise<ActionResult>
> = {
  invite: acceptInvite,
  reset: resetPassword,
};

export function SetPasswordForm({
  purpose,
  token,
}: {
  purpose: 'invite' | 'reset';
  token: string;
}) {
  const form = useForm<SetPasswordInput>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { password: '', confirm: '' },
  });
  const [failure, setFailure] = useState<{
    error: string;
    code?: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = form.handleSubmit((values) => {
    if (pending) {
      return;
    }
    setFailure(null);
    startTransition(async () => {
      const result = await ACTIONS[purpose](token, values);
      if (result && !result.ok) {
        setServerErrors(form, result.fieldErrors);
        setFailure(result);
      }
    });
  });

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="grid gap-4">
      <FieldGroup>
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="new-password">Mot de passe</FieldLabel>
              <Input
                {...field}
                id="new-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={fieldState.invalid}
                aria-describedby="new-password-help"
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : (
                <FieldDescription id="new-password-help">
                  8 caractères au moins.
                </FieldDescription>
              )}
            </Field>
          )}
        />
        <Controller
          name="confirm"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="confirm-password">Confirmer</FieldLabel>
              <Input
                {...field}
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>
      <SubmitButton
        pending={pending}
        pendingLabel="Enregistrement en cours"
        className="w-full"
      >
        Enregistrer le mot de passe
      </SubmitButton>
      {failure && <FieldError>{failure.error}</FieldError>}
      {failure?.code === 'INVALID_LINK' && purpose === 'reset' && (
        <Link href="/forgot-password" className="link text-sm">
          Recevoir un nouveau lien
        </Link>
      )}
      {pending && <WakingBanner />}
    </form>
  );
}

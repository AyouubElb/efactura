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
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { WakingBanner } from '@/components/waking-banner';
import { setServerErrors } from '@/lib/forms';
import { forgotPassword } from './auth.actions';
import { forgotPasswordSchema, type ForgotPasswordInput } from './auth.schemas';

export function ForgotPasswordForm() {
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  const onSubmit = form.handleSubmit((values) => {
    if (pending) {
      return;
    }
    setFormError(null);
    startTransition(async () => {
      const result = await forgotPassword(values);
      if (result.ok) {
        setSent(true);
        return;
      }
      setServerErrors(form, result.fieldErrors);
      setFormError(result.error);
    });
  });

  if (sent) {
    return (
      <div className="grid gap-4">
        <p role="status">
          Si un compte existe pour cette adresse, un e-mail vient de partir.
          Ouvrez le lien qu&apos;il contient pour choisir un nouveau mot de
          passe.
        </p>
        <Link href="/login" className="link text-sm">
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="grid gap-4">
      <Controller
        name="email"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="forgot-email">E-mail</FieldLabel>
            <Input
              {...field}
              id="forgot-email"
              type="email"
              inputMode="email"
              autoComplete="username"
              aria-invalid={fieldState.invalid}
              aria-describedby="forgot-email-help"
            />
            {fieldState.invalid ? (
              <FieldError errors={[fieldState.error]} />
            ) : (
              <FieldDescription id="forgot-email-help">
                Vous recevrez un lien pour choisir un nouveau mot de passe.
              </FieldDescription>
            )}
          </Field>
        )}
      />
      <SubmitButton
        pending={pending}
        pendingLabel="Envoi en cours"
        className="w-full"
      >
        Recevoir le lien
      </SubmitButton>
      {formError && <FieldError>{formError}</FieldError>}
      {pending && <WakingBanner />}
      <Link href="/login" className="link text-xs">
        Retour à la connexion
      </Link>
    </form>
  );
}

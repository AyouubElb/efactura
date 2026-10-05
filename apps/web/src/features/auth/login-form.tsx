'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { SubmitButton } from '@/components/submit-button';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { WakingBanner } from '@/components/waking-banner';
import { setServerErrors } from '@/lib/forms';
import { login } from './auth.actions';
import { loginSchema, type LoginInput } from './auth.schemas';

export function LoginForm({ next }: { next: string | null }) {
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = form.handleSubmit((values) => {
    if (pending) {
      return;
    }
    setFormError(null);
    startTransition(async () => {
      const result = await login(values, next);
      if (result && !result.ok) {
        setServerErrors(form, result.fieldErrors);
        setFormError(result.error);
      }
    });
  });

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="grid gap-4">
      <FieldGroup>
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="login-email">E-mail</FieldLabel>
              <Input
                {...field}
                id="login-email"
                type="email"
                inputMode="email"
                autoComplete="username"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="login-password">Mot de passe</FieldLabel>
              <Input
                {...field}
                id="login-password"
                type="password"
                autoComplete="current-password"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>
      <p className="flex justify-end text-xs">
        <Link href="/forgot-password" className="link">
          {'Mot de passe oublié ?'}
        </Link>
      </p>
      <SubmitButton
        pending={pending}
        pendingLabel="Connexion en cours"
        className="w-full"
      >
        Se connecter
      </SubmitButton>
      {formError && <FieldError>{formError}</FieldError>}
      {pending && <WakingBanner />}
    </form>
  );
}

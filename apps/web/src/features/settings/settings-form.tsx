'use client';

import { useState, useTransition } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { SubmitButton } from '@/components/submit-button';
import { TextField } from '@/components/text-field';
import { FieldError, FieldLegend, FieldSet } from '@/components/ui/field';
import { WakingBanner } from '@/components/waking-banner';
import { setServerErrors } from '@/lib/forms';
import { saveSettings } from './settings.actions';
import { settingsSchema, type SettingsInput } from './settings.schemas';
import type { Settings } from './settings.types';
import { TvaRatesField } from './tva-rates-field';

function defaults(settings: Settings): SettingsInput {
  const identity = settings.identity;
  return {
    legalName: identity?.legalName ?? '',
    address: identity?.address ?? '',
    city: identity?.city ?? '',
    phone: identity?.phone ?? '',
    email: identity?.email ?? '',
    ice: identity?.ice ?? '',
    ifNumber: identity?.ifNumber ?? '',
    tpNumber: identity?.tpNumber ?? '',
    rcNumber: identity?.rcNumber ?? '',
    rcCity: identity?.rcCity ?? '',
    bankName: identity?.bankName ?? '',
    rib: identity?.rib ?? '',
    defaultPaymentDays: String(settings.defaultPaymentDays),
    defaultQuoteValidityDays: String(settings.defaultQuoteValidityDays),
    tvaRatesBp: settings.tvaRatesBp,
    priceRiseThresholdPercent: settings.priceRiseThresholdPercent,
  };
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-line p-4 first:border-t-0">
      <FieldSet className="gap-4">
        <FieldLegend variant="label" className="caps mb-3 text-pencil">
          {title}
        </FieldLegend>
        <div className="grid gap-4 sm:grid-cols-2">{children}</div>
      </FieldSet>
    </div>
  );
}

export function SettingsForm({ settings }: { settings: Settings }) {
  const form = useForm<SettingsInput>({
    resolver: zodResolver(settingsSchema),
    defaultValues: defaults(settings),
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { control } = form;

  const onSubmit = form.handleSubmit((values) => {
    if (pending) {
      return;
    }
    setFormError(null);
    startTransition(async () => {
      const result = await saveSettings(values);
      if (!result.ok) {
        setServerErrors(form, result.fieldErrors);
        setFormError(result.error);
        return;
      }
      toast.success('Paramètres enregistrés.');
    });
  });

  return (
    <form
      method="post"
      onSubmit={onSubmit}
      noValidate
      className="rounded-md border border-line bg-card"
    >
      <Section title="Identité de la boutique">
        <TextField
          control={control}
          name="legalName"
          id="settings-legal-name"
          label="Raison sociale"
          autoComplete="organization"
        />
        <TextField
          control={control}
          name="address"
          id="settings-address"
          label="Adresse"
          autoComplete="street-address"
        />
        <TextField
          control={control}
          name="city"
          id="settings-city"
          label="Ville"
          autoComplete="address-level2"
        />
        <TextField
          control={control}
          name="phone"
          id="settings-phone"
          label="Téléphone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
        />
        <TextField
          control={control}
          name="email"
          id="settings-email"
          label="E-mail"
          type="email"
          inputMode="email"
          autoComplete="email"
        />
      </Section>

      <Section title="Identifiants légaux">
        <TextField
          control={control}
          name="ice"
          id="settings-ice"
          label="ICE"
          help="15 chiffres."
          inputMode="numeric"
          autoComplete="off"
          className="font-mono"
        />
        <TextField
          control={control}
          name="ifNumber"
          id="settings-if"
          label="Identifiant fiscal (IF)"
          autoComplete="off"
          className="font-mono"
        />
        <TextField
          control={control}
          name="tpNumber"
          id="settings-tp"
          label="Taxe professionnelle (TP)"
          autoComplete="off"
          className="font-mono"
        />
        <TextField
          control={control}
          name="rcNumber"
          id="settings-rc"
          label="Registre de commerce (RC)"
          autoComplete="off"
          className="font-mono"
        />
        <TextField
          control={control}
          name="rcCity"
          id="settings-rc-city"
          label="Ville du registre de commerce"
          autoComplete="off"
        />
      </Section>

      <Section title="Banque">
        <TextField
          control={control}
          name="bankName"
          id="settings-bank"
          label="Banque"
          autoComplete="off"
        />
        <TextField
          control={control}
          name="rib"
          id="settings-rib"
          label="RIB"
          help="24 chiffres, imprimés sur les factures pour les virements."
          inputMode="numeric"
          autoComplete="off"
          className="font-mono"
        />
      </Section>

      <Section title="Valeurs par défaut">
        <TextField
          control={control}
          name="defaultPaymentDays"
          id="settings-payment-days"
          label="Délai de paiement, en jours"
          help="Pour chaque nouveau client. 120 au plus, selon la loi 69-21."
          inputMode="numeric"
          autoComplete="off"
          className="max-w-28"
        />
        <TextField
          control={control}
          name="defaultQuoteValidityDays"
          id="settings-quote-days"
          label="Validité des devis, en jours"
          help="Un devis passe ensuite à « Expiré »."
          inputMode="numeric"
          autoComplete="off"
          className="max-w-28"
        />
        <div className="sm:col-span-2">
          <Controller
            name="tvaRatesBp"
            control={control}
            render={({ field, fieldState }) => (
              <TvaRatesField
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
        </div>
      </Section>

      <div className="grid justify-items-end gap-2 border-t border-line px-4 py-3">
        <SubmitButton pending={pending} pendingLabel="Enregistrement en cours">
          Enregistrer les paramètres
        </SubmitButton>
        {formError && <FieldError>{formError}</FieldError>}
        {pending && <WakingBanner />}
      </div>
    </form>
  );
}

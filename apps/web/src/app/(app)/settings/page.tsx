import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminOnly } from '@/components/admin-only';
import { Notice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { FormSkeleton } from '@/components/page-skeleton';
import { getMe } from '@/features/auth/auth.queries';
import { LogoCard } from '@/features/settings/logo-card';
import { NumberingCard } from '@/features/settings/numbering-card';
import { SettingsForm } from '@/features/settings/settings-form';
import {
  getNumbering,
  getSettings,
} from '@/features/settings/settings.queries';

export const metadata: Metadata = { title: 'Paramètres' };

export default async function SettingsPage() {
  const me = await getMe();
  if (me.role !== 'admin') {
    return <AdminOnly title="Paramètres" />;
  }
  return (
    <div className="grid gap-5">
      <PageHeader crumb="Administration" title="Paramètres" />
      <Suspense fallback={<FormSkeleton />}>
        <SettingsContent />
      </Suspense>
    </div>
  );
}

async function SettingsContent() {
  const [settings, counters] = await Promise.all([
    getSettings(),
    getNumbering(),
  ]);
  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,44rem)_minmax(0,20rem)]">
      <div className="grid gap-4">
        {!settings.configured && (
          <Notice tone="check" stamp="À faire">
            {
              "Remplissez l'identité de la boutique : elle s'imprime sur chaque devis et chaque facture."
            }
          </Notice>
        )}
        <SettingsForm settings={settings} />
      </div>
      <div className="grid gap-4">
        <LogoCard logoUrl={settings.logoUrl} />
        <NumberingCard counters={counters} />
      </div>
    </div>
  );
}

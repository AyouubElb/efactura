import type { Metadata } from 'next';
import { after } from 'next/server';
import { Notice } from '@/components/notice';
import { PaperCard } from '@/components/paper-card';
import { LoginForm } from '@/features/auth/login-form';
import { pingApi, WAKE_TIMEOUT_MS } from '@/lib/api-core';
import { safeNextPath } from '@/lib/next-path';

export const metadata: Metadata = { title: 'Connexion' };

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const { next, password, expired } = await searchParams;
  // Wakes a sleeping API while the person types, from the server, never the browser
  after(() => pingApi(WAKE_TIMEOUT_MS));

  return (
    <PaperCard title="Connexion">
      {password === 'set' && (
        <Notice tone="done" stamp="Fait">
          Mot de passe enregistré.{' '}
          <span className="whitespace-nowrap">Connectez-vous.</span>
        </Notice>
      )}
      {expired !== undefined && (
        <Notice tone="closed" stamp="Session">
          Votre session a pris fin.{' '}
          <span className="whitespace-nowrap">Connectez-vous</span> à nouveau.
        </Notice>
      )}
      <LoginForm next={safeNextPath(next)} />
    </PaperCard>
  );
}

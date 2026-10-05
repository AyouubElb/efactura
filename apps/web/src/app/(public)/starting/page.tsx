import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Notice } from '@/components/notice';
import { PaperCard } from '@/components/paper-card';
import { StartingWatcher } from '@/features/auth/starting-watcher';
import { pingApi } from '@/lib/api-core';
import { safeNextPath } from '@/lib/next-path';

export const metadata: Metadata = { title: "L'application démarre" };

const AWAKE_CHECK_MS = 4_000;

// The session must renew before the page, and the API is still waking up
export default async function StartingPage({
  searchParams,
}: PageProps<'/starting'>) {
  const asked = safeNextPath((await searchParams).next);
  const target = asked && !asked.startsWith('/starting') ? asked : '/dashboard';
  if (await pingApi(AWAKE_CHECK_MS)) {
    redirect(target);
  }

  return (
    <PaperCard>
      <Notice tone="way" stamp="Patience">
        L&apos;application démarre. La page s&apos;affiche dans une minute
        environ.
      </Notice>
      <StartingWatcher />
    </PaperCard>
  );
}

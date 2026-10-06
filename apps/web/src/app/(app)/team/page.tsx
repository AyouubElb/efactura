import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminOnly } from '@/components/admin-only';
import { PageHeader } from '@/components/page-header';
import { ListSkeleton } from '@/components/page-skeleton';
import { NewRecordButton, PanelProvider } from '@/components/record-panel';
import { getMe } from '@/features/auth/auth.queries';
import { InvitePanel } from '@/features/team/invite-panel';
import { TeamList } from '@/features/team/team-list';
import { listTeam } from '@/features/team/team.queries';

export const metadata: Metadata = { title: 'Équipe' };

export default async function TeamPage() {
  const me = await getMe();
  if (me.role !== 'admin') {
    return <AdminOnly title="Équipe" />;
  }
  return (
    <PanelProvider>
      <div className="grid gap-5">
        <PageHeader
          crumb="Administration"
          title="Équipe"
          action={<NewRecordButton>Inviter une personne</NewRecordButton>}
        />
        <Suspense fallback={<ListSkeleton />}>
          <Team meId={me.id} />
        </Suspense>
      </div>
      <InvitePanel />
    </PanelProvider>
  );
}

async function Team({ meId }: { meId: string }) {
  const members = await listTeam();
  return <TeamList members={members} meId={meId} />;
}

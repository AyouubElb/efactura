import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { AdminOnly } from '@/components/admin-only';
import { PageHeader } from '@/components/page-header';
import { ListSkeleton } from '@/components/page-skeleton';
import { Pager } from '@/components/pager';
import { ActivityList } from '@/features/activity/activity-list';
import { listActivity } from '@/features/activity/activity.queries';
import { PersonFilter } from '@/features/activity/person-filter';
import { getMe } from '@/features/auth/auth.queries';
import { listTeam } from '@/features/team/team.queries';
import {
  lastPageHref,
  readActivityParams,
  type ListParams,
} from '@/lib/list-params';

export const metadata: Metadata = { title: 'Activité' };

const PATH = '/activity';

export default async function ActivityPage({
  searchParams,
}: PageProps<'/activity'>) {
  const me = await getMe();
  if (me.role !== 'admin') {
    return <AdminOnly title="Activité" />;
  }
  const params = readActivityParams(await searchParams);
  return (
    <div className="grid gap-5">
      <PageHeader crumb="Administration" title="Activité" />
      <Suspense fallback={<PersonFilter params={params} people={[]} />}>
        <Filter params={params} />
      </Suspense>
      <Suspense fallback={<ListSkeleton />}>
        <Entries params={params} />
      </Suspense>
    </div>
  );
}

async function Filter({ params }: { params: ListParams }) {
  const team = await listTeam();
  return (
    <PersonFilter
      params={params}
      people={team.map(({ id, fullName }) => ({ id, fullName }))}
    />
  );
}

async function Entries({ params }: { params: ListParams }) {
  const { items, meta } = await listActivity(params);
  const back = lastPageHref(PATH, params, meta);
  if (back) {
    redirect(back);
  }
  return (
    <>
      <ActivityList entries={items} />
      <Pager pathname={PATH} params={params} meta={meta} />
    </>
  );
}

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { NewDocumentLink } from '@/components/new-document-link';
import { PageHeader } from '@/components/page-header';
import { ListSkeleton } from '@/components/page-skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { getMe } from '@/features/auth/auth.queries';
import { getRecent, getTotals } from '@/features/dashboard/dashboard.queries';
import { MoneyCards } from '@/features/dashboard/money-cards';
import { RecentList } from '@/features/dashboard/recent-list';
import { monthInMorocco } from '@/lib/format';

export const metadata: Metadata = { title: 'Tableau de bord' };

// The four amounts are the admin's; everyone sees the latest documents
export default async function DashboardPage() {
  const me = await getMe();
  const firstName = me.fullName.trim().split(/\s+/)[0];

  return (
    <div className="grid gap-6">
      <PageHeader
        crumb={monthInMorocco()}
        title={`Bonjour ${firstName}`}
        action={
          <NewDocumentLink href="/quotes/new">Nouveau devis</NewDocumentLink>
        }
      />
      {me.role === 'admin' && (
        <Suspense fallback={<CardsSkeleton />}>
          <Totals />
        </Suspense>
      )}
      <section aria-labelledby="recent-title" className="grid gap-3">
        <h2 id="recent-title" className="caps text-pencil">
          Documents récents
        </h2>
        <Suspense fallback={<ListSkeleton />}>
          <Recent />
        </Suspense>
      </section>
    </div>
  );
}

async function Totals() {
  return <MoneyCards totals={await getTotals()} />;
}

async function Recent() {
  return <RecentList documents={await getRecent()} />;
}

function CardsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
      {[0, 1, 2, 3].map((tile) => (
        <div
          key={tile}
          className="grid gap-3 rounded-md border border-line bg-card p-4"
        >
          <Skeleton className="w-28" />
          <Skeleton className="h-6 w-32" />
        </div>
      ))}
    </div>
  );
}

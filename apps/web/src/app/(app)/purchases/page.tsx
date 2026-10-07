import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { FilterTabs } from '@/components/filter-tabs';
import { NewDocumentLink } from '@/components/new-document-link';
import { PageHeader } from '@/components/page-header';
import { ListSkeleton } from '@/components/page-skeleton';
import { Pager } from '@/components/pager';
import { PurchaseList } from '@/features/purchases/purchase-list';
import {
  countToReview,
  listPurchases,
} from '@/features/purchases/purchases.queries';
import { PURCHASE_TABS } from '@/features/purchases/purchases.types';
import {
  lastPageHref,
  listHref,
  readDocumentListParams,
  type ListParams,
} from '@/lib/list-params';

export const metadata: Metadata = { title: 'Achats' };

const PATH = '/purchases';

const TABS: { status?: string; label: string }[] = [
  { label: 'Tous' },
  { status: 'ready', label: 'À vérifier' },
  { status: 'reading', label: 'Lecture en cours' },
  { status: 'confirmed', label: 'Validés' },
  { status: 'failed', label: 'Échecs' },
  { status: 'discarded', label: 'Écartés' },
];

export default async function PurchasesPage({
  searchParams,
}: PageProps<'/purchases'>) {
  const params: ListParams = {
    ...readDocumentListParams(await searchParams, PURCHASE_TABS),
    client: undefined,
  };
  return (
    <div className="grid gap-5">
      <PageHeader
        title="Achats"
        action={
          <NewDocumentLink href="/purchases/new">
            Importer une facture
          </NewDocumentLink>
        }
      />
      <Suspense fallback={<Tabs params={params} toReview={0} />}>
        <TabsLoaded params={params} />
      </Suspense>
      <Suspense fallback={<ListSkeleton />}>
        <Purchases params={params} />
      </Suspense>
    </div>
  );
}

function Tabs({ params, toReview }: { params: ListParams; toReview: number }) {
  return (
    <FilterTabs
      label="Achats à afficher"
      tabs={TABS.map((tab) => ({
        label: tab.label,
        href: listHref(PATH, { ...params, status: tab.status, page: 1 }),
        current: params.status === tab.status,
        count: tab.status === 'ready' ? toReview : undefined,
        countTone: 'check',
      }))}
    />
  );
}

async function TabsLoaded({ params }: { params: ListParams }) {
  return <Tabs params={params} toReview={await countToReview()} />;
}

async function Purchases({ params }: { params: ListParams }) {
  const { items, meta } = await listPurchases(params);
  const back = lastPageHref(PATH, params, meta);
  if (back) {
    redirect(back);
  }
  return (
    <>
      <PurchaseList purchases={items} params={params} />
      <Pager pathname={PATH} params={params} meta={meta} />
    </>
  );
}

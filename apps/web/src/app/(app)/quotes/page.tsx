import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { FilterTabs } from '@/components/filter-tabs';
import { NewDocumentLink } from '@/components/new-document-link';
import { PageHeader } from '@/components/page-header';
import { ListSkeleton } from '@/components/page-skeleton';
import { Pager } from '@/components/pager';
import { getClient } from '@/features/clients/clients.queries';
import { ClientFilter } from '@/features/documents/client-filter';
import { QuoteList } from '@/features/quotes/quote-list';
import { listQuotes } from '@/features/quotes/quotes.queries';
import { QUOTE_TABS } from '@/features/quotes/quotes.types';
import {
  lastPageHref,
  listHref,
  readDocumentListParams,
  type ListParams,
} from '@/lib/list-params';

export const metadata: Metadata = { title: 'Devis' };

const PATH = '/quotes';

const TABS: { status?: string; label: string }[] = [
  { label: 'Tous' },
  { status: 'draft', label: 'Brouillons' },
  { status: 'sent', label: 'Envoyés' },
  { status: 'expired', label: 'Expirés' },
  { status: 'accepted', label: 'Acceptés' },
  { status: 'refused', label: 'Refusés' },
  { status: 'replaced', label: 'Remplacés' },
];

export default async function QuotesPage({
  searchParams,
}: PageProps<'/quotes'>) {
  const params = readDocumentListParams(await searchParams, QUOTE_TABS);
  return (
    <div className="grid gap-5">
      <PageHeader
        crumb="Ventes"
        title="Devis"
        action={
          <NewDocumentLink href="/quotes/new">Nouveau devis</NewDocumentLink>
        }
      />
      <div className="grid gap-3">
        <FilterTabs
          label="Devis à afficher"
          tabs={TABS.map((tab) => ({
            label: tab.label,
            href: listHref(PATH, { ...params, status: tab.status, page: 1 }),
            current: params.status === tab.status,
          }))}
        />
        <Suspense
          fallback={
            <ClientFilter pathname={PATH} params={params} clientName="…" />
          }
        >
          <ClientFilterLoaded params={params} />
        </Suspense>
      </div>
      <Suspense fallback={<ListSkeleton />}>
        <Quotes params={params} />
      </Suspense>
    </div>
  );
}

async function ClientFilterLoaded({ params }: { params: ListParams }) {
  const client = params.client ? await getClient(params.client) : null;
  return (
    <ClientFilter
      pathname={PATH}
      params={params}
      clientName={client?.name ?? null}
    />
  );
}

async function Quotes({ params }: { params: ListParams }) {
  const { items, meta } = await listQuotes(params);
  const back = lastPageHref(PATH, params, meta);
  if (back) {
    redirect(back);
  }
  return (
    <>
      <QuoteList quotes={items} params={params} />
      <Pager pathname={PATH} params={params} meta={meta} />
    </>
  );
}

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { FilterTabs } from '@/components/filter-tabs';
import { PageHeader } from '@/components/page-header';
import { ListSkeleton } from '@/components/page-skeleton';
import { Pager } from '@/components/pager';
import { NewRecordButton, PanelProvider } from '@/components/record-panel';
import { SearchField } from '@/components/search-field';
import { ClientList } from '@/features/clients/client-list';
import { ClientPanel } from '@/features/clients/client-panel';
import { listClients } from '@/features/clients/clients.queries';
import { getSettings } from '@/features/settings/settings.queries';
import {
  lastPageHref,
  listHref,
  readListParams,
  type ListParams,
} from '@/lib/list-params';

export const metadata: Metadata = { title: 'Clients' };

const PATH = '/clients';

export default async function ClientsPage({
  searchParams,
}: PageProps<'/clients'>) {
  const params = readListParams(await searchParams);
  return (
    <PanelProvider>
      <div className="grid gap-5">
        <PageHeader
          crumb="Catalogue"
          title="Clients"
          action={<NewRecordButton>Nouveau client</NewRecordButton>}
        />
        <div className="grid gap-3">
          <FilterTabs
            label="Clients à afficher"
            tabs={[
              {
                label: 'Actifs',
                href: listHref(PATH, { ...params, archived: false, page: 1 }),
                current: !params.archived,
              },
              {
                label: 'Archivés',
                href: listHref(PATH, { ...params, archived: true, page: 1 }),
                current: params.archived,
              },
            ]}
          />
          <SearchField
            id="clients-search"
            placeholder="Rechercher un nom ou un ICE"
            pathname={PATH}
            params={params}
          />
        </div>
        <Suspense fallback={<ListSkeleton />}>
          <Clients params={params} />
        </Suspense>
      </div>
    </PanelProvider>
  );
}

async function Clients({ params }: { params: ListParams }) {
  const [{ items, meta }, settings] = await Promise.all([
    listClients(params),
    getSettings(),
  ]);
  const back = lastPageHref(PATH, params, meta);
  if (back) {
    redirect(back);
  }
  return (
    <>
      <ClientList clients={items} pathname={PATH} params={params} />
      <Pager pathname={PATH} params={params} meta={meta} />
      <ClientPanel defaultPaymentDays={settings.defaultPaymentDays} />
    </>
  );
}

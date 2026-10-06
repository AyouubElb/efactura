import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { FilterTabs } from '@/components/filter-tabs';
import { PageHeader } from '@/components/page-header';
import { ListSkeleton } from '@/components/page-skeleton';
import { Pager } from '@/components/pager';
import { NewRecordButton, PanelProvider } from '@/components/record-panel';
import { SearchField } from '@/components/search-field';
import { SupplierList } from '@/features/suppliers/supplier-list';
import { SupplierPanel } from '@/features/suppliers/supplier-panel';
import { listSuppliers } from '@/features/suppliers/suppliers.queries';
import {
  lastPageHref,
  listHref,
  readListParams,
  type ListParams,
} from '@/lib/list-params';

export const metadata: Metadata = { title: 'Fournisseurs' };

const PATH = '/suppliers';

export default async function SuppliersPage({
  searchParams,
}: PageProps<'/suppliers'>) {
  const params = readListParams(await searchParams);
  return (
    <PanelProvider>
      <div className="grid gap-5">
        <PageHeader
          crumb="Catalogue"
          title="Fournisseurs"
          action={<NewRecordButton>Nouveau fournisseur</NewRecordButton>}
        />
        <div className="grid gap-3">
          <FilterTabs
            label="Fournisseurs à afficher"
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
            id="suppliers-search"
            placeholder="Rechercher un nom ou un ICE"
            pathname={PATH}
            params={params}
          />
        </div>
        <Suspense fallback={<ListSkeleton />}>
          <Suppliers params={params} />
        </Suspense>
      </div>
    </PanelProvider>
  );
}

async function Suppliers({ params }: { params: ListParams }) {
  const { items, meta } = await listSuppliers(params);
  const back = lastPageHref(PATH, params, meta);
  if (back) {
    redirect(back);
  }
  return (
    <>
      <SupplierList suppliers={items} pathname={PATH} params={params} />
      <Pager pathname={PATH} params={params} meta={meta} />
      <SupplierPanel />
    </>
  );
}

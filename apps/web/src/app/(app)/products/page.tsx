import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { FilterTabs } from '@/components/filter-tabs';
import { PageHeader } from '@/components/page-header';
import { ListSkeleton } from '@/components/page-skeleton';
import { Pager } from '@/components/pager';
import { NewRecordButton, PanelProvider } from '@/components/record-panel';
import { SearchField } from '@/components/search-field';
import { ProductList } from '@/features/products/product-list';
import { ProductPanel } from '@/features/products/product-panel';
import { listProducts } from '@/features/products/products.queries';
import { getSettings } from '@/features/settings/settings.queries';
import {
  lastPageHref,
  listHref,
  readListParams,
  type ListParams,
} from '@/lib/list-params';

export const metadata: Metadata = { title: 'Produits' };

const PATH = '/products';

export default async function ProductsPage({
  searchParams,
}: PageProps<'/products'>) {
  const params = readListParams(await searchParams);
  return (
    <PanelProvider>
      <div className="grid gap-5">
        <PageHeader
          crumb="Catalogue"
          title="Produits"
          action={<NewRecordButton>Nouveau produit</NewRecordButton>}
        />
        <div className="grid gap-3">
          <FilterTabs
            label="Produits à afficher"
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
            id="products-search"
            placeholder="Rechercher un nom ou une référence"
            pathname={PATH}
            params={params}
          />
        </div>
        <Suspense fallback={<ListSkeleton />}>
          <Products params={params} />
        </Suspense>
      </div>
    </PanelProvider>
  );
}

async function Products({ params }: { params: ListParams }) {
  const [{ items, meta }, settings] = await Promise.all([
    listProducts(params),
    getSettings(),
  ]);
  const back = lastPageHref(PATH, params, meta);
  if (back) {
    redirect(back);
  }
  return (
    <>
      <ProductList products={items} pathname={PATH} params={params} />
      <Pager pathname={PATH} params={params} meta={meta} />
      <ProductPanel tvaRatesBp={settings.tvaRatesBp} />
    </>
  );
}

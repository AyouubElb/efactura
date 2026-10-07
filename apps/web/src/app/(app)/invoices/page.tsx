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
import { InvoiceList } from '@/features/invoices/invoice-list';
import { countLate, listInvoices } from '@/features/invoices/invoices.queries';
import { INVOICE_TABS } from '@/features/invoices/invoices.types';
import {
  lastPageHref,
  listHref,
  readDocumentListParams,
  type ListParams,
} from '@/lib/list-params';

export const metadata: Metadata = { title: 'Factures' };

const PATH = '/invoices';

const TABS: { status?: string; label: string }[] = [
  { label: 'Toutes' },
  { status: 'draft', label: 'Brouillons' },
  { status: 'sent', label: 'Envoyées' },
  { status: 'late', label: 'En retard' },
  { status: 'paid', label: 'Payées' },
  { status: 'cancelled', label: 'Annulées' },
];

export default async function InvoicesPage({
  searchParams,
}: PageProps<'/invoices'>) {
  const params = readDocumentListParams(await searchParams, INVOICE_TABS);
  return (
    <div className="grid gap-5">
      <PageHeader
        crumb="Ventes"
        title="Factures"
        action={
          <NewDocumentLink href="/invoices/new">
            Nouvelle facture
          </NewDocumentLink>
        }
      />
      <div className="grid gap-3">
        <Suspense fallback={<Tabs params={params} late={0} />}>
          <TabsLoaded params={params} />
        </Suspense>
        <Suspense
          fallback={
            <ClientFilter pathname={PATH} params={params} clientName="…" />
          }
        >
          <ClientFilterLoaded params={params} />
        </Suspense>
      </div>
      <Suspense fallback={<ListSkeleton />}>
        <Invoices params={params} />
      </Suspense>
    </div>
  );
}

function Tabs({ params, late }: { params: ListParams; late: number }) {
  return (
    <FilterTabs
      label="Factures à afficher"
      tabs={TABS.map((tab) => ({
        label: tab.label,
        href: listHref(PATH, { ...params, status: tab.status, page: 1 }),
        current: params.status === tab.status,
        count: tab.status === 'late' ? late : undefined,
      }))}
    />
  );
}

async function TabsLoaded({ params }: { params: ListParams }) {
  return <Tabs params={params} late={await countLate(params.client)} />;
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

async function Invoices({ params }: { params: ListParams }) {
  const { items, meta } = await listInvoices(params);
  const back = lastPageHref(PATH, params, meta);
  if (back) {
    redirect(back);
  }
  return (
    <>
      <InvoiceList invoices={items} params={params} />
      <Pager pathname={PATH} params={params} meta={meta} />
    </>
  );
}

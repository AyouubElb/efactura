import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { todayInMorocco } from '@efactura/shared';
import { Notice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { Stamp } from '@/components/stamp';
import { HistoryCard } from '@/features/documents/side-cards';
import { OriginalViewer } from '@/features/purchases/original-viewer';
import { FailedActions } from '@/features/purchases/purchase-actions';
import {
  PurchaseGrid,
  PurchaseTitle,
} from '@/features/purchases/purchase-grid';
import { PurchaseView } from '@/features/purchases/purchase-view';
import { purchaseLook } from '@/features/purchases/purchases.labels';
import { getPurchase } from '@/features/purchases/purchases.queries';
import { ReadingWait } from '@/features/purchases/reading-wait';
import { ReviewForm } from '@/features/purchases/review-form';
import { getSettings } from '@/features/settings/settings.queries';
import { getSupplier } from '@/features/suppliers/suppliers.queries';
import { isRecordId, sentence } from '@/lib/action-result';

export async function generateMetadata({
  params,
}: PageProps<'/purchases/[id]'>): Promise<Metadata> {
  const { id } = await params;
  if (!isRecordId(id)) {
    return { title: 'Achat' };
  }
  const purchase = await getPurchase(id);
  return {
    title: purchase.invoiceNumber ? `Achat ${purchase.invoiceNumber}` : 'Achat',
  };
}

// One address for the whole life of an achat: the wait, the review, then the record
export default async function PurchasePage({
  params,
}: PageProps<'/purchases/[id]'>) {
  const { id } = await params;
  if (!isRecordId(id)) {
    notFound();
  }
  const purchase = await getPurchase(id);
  const { status, draft } = purchase;
  if (status === 'ready' && draft) {
    const [settings, supplier] = await Promise.all([
      getSettings(),
      draft.supplier.id ? getSupplier(draft.supplier.id) : null,
    ]);
    const read = purchase.history.find(
      (entry) => entry.action === 'purchase.read',
    );
    return (
      <ReviewForm
        key={purchase.id}
        id={purchase.id}
        createdAt={purchase.createdAt}
        draft={draft}
        products={purchase.products}
        supplier={
          supplier && {
            id: supplier.id,
            name: supplier.name,
            ice: supplier.ice,
            city: supplier.city,
          }
        }
        today={todayInMorocco()}
        tvaRatesBp={settings.tvaRatesBp}
        readAt={read?.createdAt ?? null}
        readability={purchase.proposal?.readability ?? null}
        fileType={purchase.fileType}
        pageCount={purchase.pageCount}
        history={purchase.history}
      />
    );
  }
  if (status === 'confirmed' || status === 'discarded') {
    return <PurchaseView purchase={purchase} />;
  }

  const look = purchaseLook(status, purchase.error);
  const reading =
    status === 'reading' || (status === 'uploaded' && !purchase.error);
  return (
    <div className="grid gap-6">
      <PageHeader
        crumb="Achats"
        title={
          <PurchaseTitle
            supplierName={null}
            number={null}
            createdAt={purchase.createdAt}
          />
        }
        stamp={<Stamp tone={look.tone}>{look.label}</Stamp>}
        action={!reading && <FailedActions id={purchase.id} />}
      />
      <PurchaseGrid
        original={
          <OriginalViewer
            id={purchase.id}
            fileType={purchase.fileType}
            pageCount={purchase.pageCount}
          />
        }
      >
        {reading ? (
          <ReadingWait />
        ) : (
          <>
            <Notice tone="act" stamp="Erreur">
              {sentence(purchase.error ?? "La lecture n'a pas abouti")}
            </Notice>
            <HistoryCard entries={purchase.history} />
          </>
        )}
      </PurchaseGrid>
    </div>
  );
}

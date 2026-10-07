import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { UploadForm } from '@/features/purchases/upload-form';

export const metadata: Metadata = { title: 'Importer une facture' };

export default function NewPurchasePage() {
  return (
    <div className="grid gap-5">
      <PageHeader crumb="Achats" title="Importer une facture" />
      <UploadForm />
    </div>
  );
}

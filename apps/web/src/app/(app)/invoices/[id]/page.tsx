import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMe } from '@/features/auth/auth.queries';
import { getClient } from '@/features/clients/clients.queries';
import { DocumentEditor } from '@/features/documents/document-editor';
import {
  DRAFT_DELETE_NOTE,
  editorSettings,
} from '@/features/documents/editor-settings';
import { HistoryCard, SideCard } from '@/features/documents/side-cards';
import { getInvoice } from '@/features/invoices/invoices.queries';
import { SentInvoice } from '@/features/invoices/sent-invoice';
import { getSettings } from '@/features/settings/settings.queries';
import { isRecordId } from '@/lib/action-result';

export async function generateMetadata({
  params,
}: PageProps<'/invoices/[id]'>): Promise<Metadata> {
  const { id } = await params;
  if (!isRecordId(id)) {
    return { title: 'Facture' };
  }
  const invoice = await getInvoice(id);
  return { title: invoice.number ?? 'Brouillon de facture' };
}

// A draft opens in the editor; once sent, the same address shows the document
export default async function InvoicePage({
  params,
}: PageProps<'/invoices/[id]'>) {
  const { id } = await params;
  if (!isRecordId(id)) {
    notFound();
  }
  const [invoice, me, settings] = await Promise.all([
    getInvoice(id),
    getMe(),
    getSettings(),
  ]);
  const client = await getClient(invoice.client.id);
  const isAdmin = me.role === 'admin';

  if (invoice.status === 'draft') {
    const { quote } = invoice;
    return (
      <DocumentEditor
        key={invoice.id}
        kind="invoice"
        start={{
          id: invoice.id,
          clientId: invoice.client.id,
          lines: invoice.lines,
          notes: invoice.notes,
        }}
        client={client}
        locked={
          quote
            ? `Une facture issue d'un devis garde le client du devis ${quote.number}.`
            : null
        }
        crumb="Factures"
        title="Brouillon de facture"
        settings={editorSettings(settings)}
        isAdmin={isAdmin}
        deleteNote={
          quote
            ? `${DRAFT_DELETE_NOTE} Le devis ${quote.number} pourra être converti à nouveau.`
            : DRAFT_DELETE_NOTE
        }
        aside={
          <>
            {quote && (
              <SideCard title="Devis d'origine">
                <Link href={`/quotes/${quote.id}`} className="link ref">
                  {quote.number}
                </Link>
              </SideCard>
            )}
            <HistoryCard entries={invoice.history} />
          </>
        }
      />
    );
  }
  return (
    <SentInvoice
      invoice={invoice}
      client={client}
      isAdmin={isAdmin}
      defaultPaymentDays={settings.defaultPaymentDays}
    />
  );
}

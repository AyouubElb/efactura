import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getMe } from '@/features/auth/auth.queries';
import { getClient } from '@/features/clients/clients.queries';
import { DocumentEditor } from '@/features/documents/document-editor';
import {
  DRAFT_DELETE_NOTE,
  editorSettings,
} from '@/features/documents/editor-settings';
import { HistoryCard } from '@/features/documents/side-cards';
import { getQuote } from '@/features/quotes/quotes.queries';
import { SentQuote } from '@/features/quotes/sent-quote';
import { getSettings } from '@/features/settings/settings.queries';
import { isRecordId } from '@/lib/action-result';

export async function generateMetadata({
  params,
}: PageProps<'/quotes/[id]'>): Promise<Metadata> {
  const { id } = await params;
  if (!isRecordId(id)) {
    return { title: 'Devis' };
  }
  const quote = await getQuote(id);
  return { title: quote.number ?? 'Brouillon de devis' };
}

// A draft opens in the editor; once sent, the same address shows the document
export default async function QuotePage({ params }: PageProps<'/quotes/[id]'>) {
  const { id } = await params;
  if (!isRecordId(id)) {
    notFound();
  }
  const [quote, me, settings] = await Promise.all([
    getQuote(id),
    getMe(),
    getSettings(),
  ]);
  const client = await getClient(quote.client.id);
  const isAdmin = me.role === 'admin';

  if (quote.status === 'draft') {
    const previous = quote.previousVersion;
    return (
      <DocumentEditor
        key={quote.id}
        kind="quote"
        start={{
          id: quote.id,
          clientId: quote.client.id,
          lines: quote.lines,
          notes: quote.notes,
        }}
        client={client}
        locked={
          previous
            ? `Une nouvelle version garde le client du devis ${previous.number}.`
            : null
        }
        crumb="Devis"
        title={quote.number ?? 'Brouillon de devis'}
        settings={editorSettings(settings)}
        isAdmin={isAdmin}
        deleteNote={
          previous
            ? `Ce brouillon disparaît. Le devis ${previous.number}, déjà envoyé, ne change pas.`
            : DRAFT_DELETE_NOTE
        }
        aside={<HistoryCard entries={quote.history} />}
      />
    );
  }
  return (
    <SentQuote
      quote={quote}
      client={client}
      isAdmin={isAdmin}
      defaultPaymentDays={settings.defaultPaymentDays}
    />
  );
}

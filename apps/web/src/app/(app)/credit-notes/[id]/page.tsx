import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getMe } from '@/features/auth/auth.queries';
import { getClient } from '@/features/clients/clients.queries';
import { CreditNoteView } from '@/features/invoices/credit-note-view';
import { getCreditNote } from '@/features/invoices/invoices.queries';
import { getSettings } from '@/features/settings/settings.queries';
import { isRecordId } from '@/lib/action-result';

export async function generateMetadata({
  params,
}: PageProps<'/credit-notes/[id]'>): Promise<Metadata> {
  const { id } = await params;
  if (!isRecordId(id)) {
    return { title: 'Avoir' };
  }
  return { title: (await getCreditNote(id)).number };
}

export default async function CreditNotePage({
  params,
}: PageProps<'/credit-notes/[id]'>) {
  const { id } = await params;
  if (!isRecordId(id)) {
    notFound();
  }
  const [note, me, settings] = await Promise.all([
    getCreditNote(id),
    getMe(),
    getSettings(),
  ]);
  const client = await getClient(note.client.id);
  return (
    <CreditNoteView
      note={note}
      client={client}
      isAdmin={me.role === 'admin'}
      defaultPaymentDays={settings.defaultPaymentDays}
    />
  );
}

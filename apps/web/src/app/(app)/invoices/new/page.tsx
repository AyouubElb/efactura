import type { Metadata } from 'next';
import Link from 'next/link';
import { getMe } from '@/features/auth/auth.queries';
import { getClient } from '@/features/clients/clients.queries';
import { DocumentEditor } from '@/features/documents/document-editor';
import type { DraftStart } from '@/features/documents/documents.types';
import {
  DRAFT_DELETE_NOTE,
  editorSettings,
} from '@/features/documents/editor-settings';
import { SideCard } from '@/features/documents/side-cards';
import { getInvoice } from '@/features/invoices/invoices.queries';
import { getSettings } from '@/features/settings/settings.queries';
import { isRecordId } from '@/lib/action-result';

export const metadata: Metadata = { title: 'Nouvelle facture' };

const EMPTY: DraftStart = { id: null, clientId: null, lines: [], notes: null };

// ?from=<a cancelled invoice>: "Refaire la facture" starts from its client, lines and notes
export default async function NewInvoicePage({
  searchParams,
}: PageProps<'/invoices/new'>) {
  const { from } = await searchParams;
  const [me, settings, cancelled] = await Promise.all([
    getMe(),
    getSettings(),
    isRecordId(from) ? getInvoice(from) : null,
  ]);
  const redo = cancelled?.status === 'cancelled' ? cancelled : null;
  const client = redo ? await getClient(redo.client.id) : null;

  return (
    <DocumentEditor
      key={redo?.id ?? 'new'}
      kind="invoice"
      start={
        redo
          ? {
              id: null,
              clientId: redo.client.id,
              lines: redo.lines,
              notes: redo.notes,
            }
          : EMPTY
      }
      client={client}
      locked={null}
      crumb="Factures"
      title="Nouvelle facture"
      settings={editorSettings(settings)}
      isAdmin={me.role === 'admin'}
      deleteNote={DRAFT_DELETE_NOTE}
      aside={
        redo && (
          <SideCard title="Facture corrigée">
            <p>
              Refaite d&apos;après la facture{' '}
              <Link href={`/invoices/${redo.id}`} className="link ref">
                {redo.number}
              </Link>
              {redo.creditNote && (
                <>
                  , annulée par l&apos;avoir{' '}
                  <span className="ref">{redo.creditNote.number}</span>
                </>
              )}
              .
            </p>
          </SideCard>
        )
      }
    />
  );
}

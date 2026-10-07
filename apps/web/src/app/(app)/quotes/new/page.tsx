import type { Metadata } from 'next';
import { getMe } from '@/features/auth/auth.queries';
import { DocumentEditor } from '@/features/documents/document-editor';
import {
  DRAFT_DELETE_NOTE,
  editorSettings,
} from '@/features/documents/editor-settings';
import { getSettings } from '@/features/settings/settings.queries';

export const metadata: Metadata = { title: 'Nouveau devis' };

export default async function NewQuotePage() {
  const [me, settings] = await Promise.all([getMe(), getSettings()]);
  return (
    <DocumentEditor
      kind="quote"
      start={{ id: null, clientId: null, lines: [], notes: null }}
      client={null}
      locked={null}
      crumb="Devis"
      title="Nouveau devis"
      settings={editorSettings(settings)}
      isAdmin={me.role === 'admin'}
      deleteNote={DRAFT_DELETE_NOTE}
    />
  );
}

import { formatDate } from '@efactura/shared';
import { dayInMorocco } from '@/lib/format';
import { DocumentView } from './document-view';
import { CHANNEL_WORDS } from './documents.labels';
import type {
  ClientSnapshot,
  DocumentKind,
  PrintedDocument,
  SendChannel,
  UserRef,
} from './documents.types';
import { SideCard } from './side-cards';

const ISSUED: Record<DocumentKind, string> = {
  quote: 'émis',
  invoice: 'émise',
  credit_note: 'émis',
};

// "Cabinet Benali, ICE 001234567000089, émis le 06/10/2026": the client as the document printed it
export function DocumentSubtitle({
  kind,
  client,
  issueDate,
}: {
  kind: DocumentKind;
  client: ClientSnapshot | { name: string; ice?: null };
  issueDate: string | null;
}) {
  return (
    <p className="text-label text-pencil">
      {client.name}
      {client.ice && (
        <>
          , ICE <span className="ref">{client.ice}</span>
        </>
      )}
      {issueDate && `, ${ISSUED[kind]} le ${formatDate(issueDate)}`}
    </p>
  );
}

// One devis, facture or avoir: content on the left, its life on the right
export function DocumentLayout({
  header,
  subtitle,
  kind,
  document,
  side,
}: {
  header: React.ReactNode;
  subtitle: React.ReactNode;
  kind: DocumentKind;
  document: PrintedDocument;
  side: React.ReactNode;
}) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        {header}
        {subtitle}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <DocumentView kind={kind} document={document} />
        <div className="grid content-start gap-4">{side}</div>
      </div>
    </div>
  );
}

export function SentByCard({
  by,
  at,
  via,
}: {
  by: UserRef | null;
  at: string | null;
  via: SendChannel | null;
}) {
  if (!at) {
    return null;
  }
  return (
    <SideCard title="Envoi">
      <p>
        {by ? `Par ${by.fullName} le ` : 'Le '}
        {dayInMorocco(at)}
        {via && `, ${CHANNEL_WORDS[via]}`}.
      </p>
    </SideCard>
  );
}

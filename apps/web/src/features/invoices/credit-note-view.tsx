import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Stamp } from '@/components/stamp';
import type { Client } from '@/features/clients/clients.types';
import {
  DocumentLayout,
  DocumentSubtitle,
} from '@/features/documents/document-layout';
import { CREDIT_NOTE_LOOK } from '@/features/documents/documents.labels';
import { LinkCard } from '@/features/documents/link-card';
import { HistoryCard, SideCard } from '@/features/documents/side-cards';
import { dayInMorocco } from '@/lib/format';
import { CreditNoteActions } from './credit-note-actions';
import type { CreditNote } from './invoices.types';

// A full avoir: the cancelled invoice's lines, every amount negative
export function CreditNoteView({
  note,
  client,
  isAdmin,
  defaultPaymentDays,
}: {
  note: CreditNote;
  client: Client;
  isAdmin: boolean;
  defaultPaymentDays: number;
}) {
  return (
    <DocumentLayout
      kind="credit_note"
      document={note}
      header={
        <PageHeader
          crumb="Factures"
          title={<span className="whitespace-nowrap">{note.number}</span>}
          stamp={
            <Stamp tone={CREDIT_NOTE_LOOK.tone}>{CREDIT_NOTE_LOOK.label}</Stamp>
          }
          action={
            <CreditNoteActions
              note={note}
              client={client}
              defaultPaymentDays={defaultPaymentDays}
            />
          }
        />
      }
      subtitle={
        <DocumentSubtitle
          kind="credit_note"
          client={note.clientSnapshot}
          issueDate={note.issueDate}
        />
      }
      side={
        <>
          <SideCard title="Facture annulée">
            <p>
              Annule la facture{' '}
              <Link href={`/invoices/${note.invoice.id}`} className="link ref">
                {note.invoice.number}
              </Link>
              .
            </p>
            <p>
              Motif{' '}: {note.reason}.
            </p>
          </SideCard>
          {note.shareLink && (
            <LinkCard link={note.shareLink} isAdmin={isAdmin} />
          )}
          <SideCard title="Envoi">
            <p>
              Par {note.createdBy.fullName} le {dayInMorocco(note.createdAt)}.
            </p>
          </SideCard>
          <HistoryCard entries={note.history} />
        </>
      }
    />
  );
}

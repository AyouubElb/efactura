'use client';

import type { Client } from '@/features/clients/clients.types';
import { DownloadLink, ResendButton } from '@/features/documents/resend-button';
import { deliverCreditNote } from './invoices.actions';
import type { CreditNote } from './invoices.types';

export function CreditNoteActions({
  note,
  client,
  defaultPaymentDays,
}: {
  note: CreditNote;
  client: Client;
  defaultPaymentDays: number;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <ResendButton
        kind="credit_note"
        id={note.id}
        number={note.number}
        client={client}
        defaultPaymentDays={defaultPaymentDays}
        deliver={deliverCreditNote}
      />
      <DownloadLink kind="credit_note" id={note.id} />
    </div>
  );
}

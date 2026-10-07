'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PanelSheet } from '@/components/panel-form';
import { Button } from '@/components/ui/button';
import { ClientForm } from '@/features/clients/client-panel';
import type { Client } from '@/features/clients/clients.types';
import type { ActionResult } from '@/lib/action-result';
import { KIND_LABELS, pdfPath } from './documents.labels';
import type { Delivery, DocumentKind, SendChannel } from './documents.types';
import { SendDialog } from './send-dialog';

const RESENT: Record<DocumentKind, string> = {
  quote: 'renvoyé',
  invoice: 'renvoyée',
  credit_note: 'renvoyé',
};

const THE: Record<DocumentKind, string> = {
  quote: 'le devis',
  invoice: 'la facture',
  credit_note: "l'avoir",
};

const AS_SENT: Record<DocumentKind, string> = {
  quote: "le client reçoit le devis tel qu'il a été envoyé.",
  invoice: "le client reçoit la facture telle qu'elle a été envoyée.",
  credit_note: "le client reçoit l'avoir tel qu'il a été envoyé.",
};

// The frozen document again, by any channel: same number, same PDF
export function ResendButton({
  kind,
  id,
  number,
  client,
  defaultPaymentDays,
  deliver,
}: {
  kind: DocumentKind;
  id: string;
  number: string;
  client: Client;
  defaultPaymentDays: number;
  deliver: (
    id: string,
    channel: SendChannel,
  ) => Promise<ActionResult<{ number: string; delivery: Delivery }>>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Renvoyer
      </Button>
      <SendDialog
        open={open}
        onOpenChange={setOpen}
        title={`Renvoyer ${THE[kind]} ${number}`}
        intro={<p>{`Même numéro, même PDF : ${AS_SENT[kind]}`}</p>}
        submitLabel={`Renvoyer ${THE[kind]}`}
        contact={{ phone: client.phone, email: client.email }}
        onEditClient={() => setEditing(true)}
        send={async (channel) => {
          const result = await deliver(id, channel);
          return result.ok
            ? {
                ok: true,
                title: `${KIND_LABELS[kind]} ${number} ${RESENT[kind]}`,
                kind,
                id,
                delivery: result.data.delivery,
              }
            : { ok: false, error: result.error, code: result.code };
        }}
        onDone={() => router.refresh()}
      />
      <PanelSheet
        open={editing}
        onClose={() => setEditing(false)}
        title={client.name}
      >
        <ClientForm
          key={client.id}
          client={client}
          defaultPaymentDays={defaultPaymentDays}
          onSaved={() => setEditing(false)}
        />
      </PanelSheet>
    </>
  );
}

export function DownloadLink({ kind, id }: { kind: DocumentKind; id: string }) {
  return (
    <Button asChild variant="secondary">
      <a href={pdfPath(kind, id, true)} download>
        Télécharger le PDF
      </a>
    </Button>
  );
}

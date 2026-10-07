'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import type { Client } from '@/features/clients/clients.types';
import { DownloadLink, ResendButton } from '@/features/documents/resend-button';
import { CancelDialog } from './cancel-dialog';
import { deliverInvoice, unpayInvoice } from './invoices.actions';
import type { Invoice } from './invoices.types';
import { PayDialog } from './pay-dialog';

export function InvoiceActions({
  invoice,
  client,
  isAdmin,
  defaultPaymentDays,
}: {
  invoice: Invoice;
  client: Client;
  isAdmin: boolean;
  defaultPaymentDays: number;
}) {
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [unpaying, setUnpaying] = useState(false);
  const number = invoice.number ?? '';

  if (invoice.status === 'cancelled') {
    return (
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href={`/invoices/new?from=${invoice.id}`}>
            Refaire la facture
          </Link>
        </Button>
        {invoice.creditNote && (
          <Button asChild variant="secondary">
            <Link href={`/credit-notes/${invoice.creditNote.id}`}>
              Voir l&apos;avoir {invoice.creditNote.number}
            </Link>
          </Button>
        )}
        <DownloadLink kind="invoice" id={invoice.id} />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {invoice.status === 'sent' && (
        <Button onClick={() => setPaying(true)}>Marquer payée</Button>
      )}
      <ResendButton
        kind="invoice"
        id={invoice.id}
        number={number}
        client={client}
        defaultPaymentDays={defaultPaymentDays}
        deliver={deliverInvoice}
      />
      <DownloadLink kind="invoice" id={invoice.id} />
      {invoice.status === 'sent' && (
        <Button variant="danger" onClick={() => setCancelling(true)}>
          Annuler la facture
        </Button>
      )}
      {invoice.status === 'paid' && isAdmin && (
        <Button variant="danger" onClick={() => setUnpaying(true)}>
          Annuler le paiement
        </Button>
      )}

      {invoice.status === 'sent' && (
        <>
          <PayDialog open={paying} onOpenChange={setPaying} invoice={invoice} />
          <CancelDialog
            open={cancelling}
            onOpenChange={setCancelling}
            invoice={invoice}
            client={client}
          />
        </>
      )}
      {invoice.status === 'paid' && isAdmin && (
        <ConfirmDialog
          open={unpaying}
          onOpenChange={setUnpaying}
          title={`Annuler le paiement de la facture ${number} ?`}
          keepLabel="Garder le paiement"
          confirmLabel="Oui, annuler le paiement"
          pendingLabel="Annulation en cours"
          onConfirm={async () => {
            const result = await unpayInvoice(invoice.id);
            if (!result.ok) {
              return result.error;
            }
            toast.success(`Paiement de la facture ${number} annulé.`);
            return null;
          }}
        >
          <p>
            La facture redevient «{' '}Envoyée{' '}» et compte de nouveau dans
            ce qui reste à encaisser. Le paiement effacé reste dans
            l&apos;historique.
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}

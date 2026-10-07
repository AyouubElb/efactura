import Link from 'next/link';
import { formatDate } from '@efactura/shared';
import { PageHeader } from '@/components/page-header';
import { Stamp } from '@/components/stamp';
import type { Client } from '@/features/clients/clients.types';
import {
  DocumentLayout,
  DocumentSubtitle,
  SentByCard,
} from '@/features/documents/document-layout';
import {
  invoiceLook,
  PAYMENT_WORDS,
} from '@/features/documents/documents.labels';
import { LinkCard } from '@/features/documents/link-card';
import { HistoryCard, SideCard } from '@/features/documents/side-cards';
import { InvoiceActions } from './invoice-actions';
import type { Invoice } from './invoices.types';

export function SentInvoice({
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
  const look = invoiceLook(invoice.status, invoice.late);
  return (
    <DocumentLayout
      kind="invoice"
      document={invoice}
      header={
        <PageHeader
          crumb="Factures"
          title={<span className="whitespace-nowrap">{invoice.number}</span>}
          stamp={<Stamp tone={look.tone}>{look.label}</Stamp>}
          action={
            <InvoiceActions
              invoice={invoice}
              client={client}
              isAdmin={isAdmin}
              defaultPaymentDays={defaultPaymentDays}
            />
          }
        />
      }
      subtitle={
        <DocumentSubtitle
          kind="invoice"
          client={invoice.clientSnapshot ?? invoice.client}
          issueDate={invoice.issueDate}
        />
      }
      side={
        <>
          <PaymentCard invoice={invoice} />
          {invoice.quote && (
            <SideCard title="Devis d'origine">
              <Link href={`/quotes/${invoice.quote.id}`} className="link ref">
                {invoice.quote.number}
              </Link>
            </SideCard>
          )}
          {invoice.shareLink && (
            <LinkCard link={invoice.shareLink} isAdmin={isAdmin} />
          )}
          <SentByCard
            by={invoice.sentBy}
            at={invoice.sentAt}
            via={invoice.sentVia}
          />
          <HistoryCard entries={invoice.history} />
        </>
      }
    />
  );
}

function PaymentCard({ invoice }: { invoice: Invoice }) {
  const { status, dueDate, paidOn, paymentMethod, creditNote } = invoice;
  return (
    <SideCard title="Paiement">
      {status === 'sent' && dueDate && (
        <p className={invoice.late ? 'text-red' : undefined}>
          {invoice.late ? 'Échéance dépassée' : 'Échéance'}
          {' '}: {formatDate(dueDate)}.
        </p>
      )}
      {status === 'paid' && paidOn && (
        <>
          <p>
            Payée le {formatDate(paidOn)}
            {paymentMethod && ` ${PAYMENT_WORDS[paymentMethod]}`}.
          </p>
          {invoice.paymentReference && (
            <p className="text-pencil">{invoice.paymentReference}</p>
          )}
          {invoice.paidRecordedBy && (
            <p className="text-xs text-pencil">
              Enregistré par {invoice.paidRecordedBy.fullName}.
            </p>
          )}
        </>
      )}
      {status === 'cancelled' && creditNote && (
        <p>
          Annulée par l&apos;avoir{' '}
          <Link href={`/credit-notes/${creditNote.id}`} className="link ref">
            {creditNote.number}
          </Link>
          {' '}: {creditNote.reason}.
        </p>
      )}
    </SideCard>
  );
}

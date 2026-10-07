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
import { quoteLook } from '@/features/documents/documents.labels';
import { LinkCard } from '@/features/documents/link-card';
import { HistoryCard, SideCard } from '@/features/documents/side-cards';
import { QuoteActions } from './quote-actions';
import type { Quote } from './quotes.types';

export function SentQuote({
  quote,
  client,
  isAdmin,
  defaultPaymentDays,
}: {
  quote: Quote;
  client: Client;
  isAdmin: boolean;
  defaultPaymentDays: number;
}) {
  const look = quoteLook(quote.status, quote.expired);
  return (
    <DocumentLayout
      kind="quote"
      document={quote}
      header={
        <PageHeader
          crumb="Devis"
          title={<span className="whitespace-nowrap">{quote.number}</span>}
          stamp={<Stamp tone={look.tone}>{look.label}</Stamp>}
          action={
            <QuoteActions
              quote={quote}
              client={client}
              defaultPaymentDays={defaultPaymentDays}
            />
          }
        />
      }
      subtitle={
        <DocumentSubtitle
          kind="quote"
          client={quote.clientSnapshot ?? quote.client}
          issueDate={quote.issueDate}
        />
      }
      side={
        <>
          {quote.validUntil && (
            <SideCard title="Validité">
              <p className={quote.expired ? 'text-amber' : undefined}>
                {quote.expired ? 'Expiré : valable' : 'Valable'} jusqu&apos;au{' '}
                {formatDate(quote.validUntil)}.
              </p>
            </SideCard>
          )}
          <VersionsCard quote={quote} />
          {quote.invoice && (
            <SideCard title="Facture">
              <Link href={`/invoices/${quote.invoice.id}`} className="link">
                {quote.invoice.number
                  ? `Convertie en facture ${quote.invoice.number}`
                  : 'Facture en brouillon'}
              </Link>
            </SideCard>
          )}
          {quote.shareLink && (
            <LinkCard link={quote.shareLink} isAdmin={isAdmin} />
          )}
          <SentByCard by={quote.sentBy} at={quote.sentAt} via={quote.sentVia} />
          <HistoryCard entries={quote.history} />
        </>
      }
    />
  );
}

function VersionsCard({ quote }: { quote: Quote }) {
  const { previousVersion, nextVersion } = quote;
  if (!previousVersion && !nextVersion) {
    return null;
  }
  return (
    <SideCard title="Versions">
      {previousVersion && (
        <p>
          Remplace le devis{' '}
          <Link href={`/quotes/${previousVersion.id}`} className="link ref">
            {previousVersion.number}
          </Link>
          .
        </p>
      )}
      {nextVersion && (
        <p>
          {nextVersion.status === 'draft' ? (
            <>
              <Link href={`/quotes/${nextVersion.id}`} className="link">
                Version {quote.version + 1} en brouillon
              </Link>
              {" : ce devis reste valable jusqu'à son envoi."}
            </>
          ) : (
            <>
              Remplacé par{' '}
              <Link href={`/quotes/${nextVersion.id}`} className="link ref">
                {nextVersion.number}
              </Link>
              .
            </>
          )}
        </p>
      )}
    </SideCard>
  );
}

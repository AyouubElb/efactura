import {
  formatDate,
  formatMoney,
  formatRate,
  htFromTtcCentimes,
} from '@efactura/shared';
import { NewDocumentLink } from '@/components/new-document-link';
import { PageHeader } from '@/components/page-header';
import { Stamp } from '@/components/stamp';
import { HistoryCard } from '@/features/documents/side-cards';
import { dayInMorocco, timeInMorocco } from '@/lib/format';
import { cn } from '@/lib/utils';
import { quantityText } from './drafts';
import { MarginLine, MatchChip } from './match-chip';
import { OriginalViewer } from './original-viewer';
import {
  CELL_LABEL,
  LINE_GRID,
  PurchaseGrid,
  PurchaseTitle,
} from './purchase-grid';
import {
  DOCUMENT_TYPE_LABELS,
  MATCH_LABELS,
  purchaseLook,
  scoreText,
} from './purchases.labels';
import type {
  DraftLine,
  DraftProduct,
  PurchaseDetail,
  PurchaseDraft,
} from './purchases.types';

function money(centimes: number | null): string {
  return centimes === null ? '—' : formatMoney(centimes);
}

// "Validé par Salma Berrada le 07/10/2026 à 14:32.", from the history
function closedBy(purchase: PurchaseDetail): string | null {
  const confirmed = purchase.status === 'confirmed';
  const entry = purchase.history.find(
    (item) =>
      item.action === (confirmed ? 'purchase.confirmed' : 'purchase.discarded'),
  );
  if (!entry) {
    return null;
  }
  const by = entry.user ? ` par ${entry.user.fullName}` : '';
  const at = `le ${dayInMorocco(entry.createdAt)} à ${timeInMorocco(entry.createdAt)}`;
  return `${confirmed ? 'Validé' : 'Écarté'}${by} ${at}.`;
}

// Validated or set aside: what was checked, read-only, with its history
export function PurchaseView({ purchase }: { purchase: PurchaseDetail }) {
  const look = purchaseLook(purchase.status);
  const closed = closedBy(purchase);
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <PageHeader
          crumb="Achats"
          title={
            <PurchaseTitle
              supplierName={purchase.supplierName}
              number={purchase.invoiceNumber}
              createdAt={purchase.createdAt}
            />
          }
          stamp={<Stamp tone={look.tone}>{look.label}</Stamp>}
          action={
            purchase.status === 'confirmed' && (
              <NewDocumentLink href="/purchases/new">
                Importer une autre facture
              </NewDocumentLink>
            )
          }
        />
        {closed && <p className="text-label text-pencil">{closed}</p>}
      </div>
      <PurchaseGrid
        original={
          <OriginalViewer
            id={purchase.id}
            fileType={purchase.fileType}
            pageCount={purchase.pageCount}
          />
        }
      >
        {purchase.draft && (
          <CheckedDraft
            draft={purchase.draft}
            products={purchase.products}
            supplierName={purchase.supplierName}
          />
        )}
        <HistoryCard entries={purchase.history} />
      </PurchaseGrid>
    </div>
  );
}

function CheckedDraft({
  draft,
  products,
  supplierName,
}: {
  draft: PurchaseDraft;
  products: DraftProduct[];
  supplierName: string | null;
}) {
  const known = new Map(products.map((product) => [product.id, product]));
  const withTax = draft.pricesIncludeTax;
  return (
    <>
      <section
        aria-labelledby="facts-title"
        className="grid gap-3 rounded-md border border-line bg-card p-4"
      >
        <h2 id="facts-title" className="caps text-pencil">
          Facture
        </h2>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
          <Fact label="Fournisseur">{supplierName ?? '—'}</Fact>
          <Fact label="ICE">
            {draft.supplier.ice ? (
              <span className="ref">{draft.supplier.ice}</span>
            ) : (
              'Sans ICE'
            )}
          </Fact>
          <Fact label="Type">{DOCUMENT_TYPE_LABELS[draft.documentType]}</Fact>
          <Fact label="N° de facture">
            {draft.invoiceNumber ? (
              <span className="ref">{draft.invoiceNumber}</span>
            ) : (
              '—'
            )}
          </Fact>
          <Fact label="Date">
            {draft.invoiceDate ? formatDate(draft.invoiceDate) : '—'}
          </Fact>
          <Fact label="Prix sur la facture">{withTax ? 'TTC' : 'HT'}</Fact>
        </dl>
      </section>

      <section aria-labelledby="lines-title" className="grid gap-3">
        <h2 id="lines-title" className="caps text-pencil">
          Lignes
        </h2>
        <div className="rounded-md border border-line bg-card">
          <div
            aria-hidden
            className={cn(
              LINE_GRID,
              'hidden caps border-b-[3px] border-double border-ink px-3 py-2.5 lg:grid',
            )}
          >
            <span>Ligne lue et produit</span>
            <span className="text-right">Qté</span>
            <span className="text-right">{withTax ? 'PU TTC' : 'PU HT'}</span>
            <span>TVA</span>
            <span className="text-right">
              {withTax ? 'Total TTC' : 'Total HT'}
            </span>
          </div>
          <ol className="divide-y divide-line">
            {draft.lines.map((line, index) => (
              <CheckedLine
                key={index}
                line={line}
                known={known}
                withTax={withTax}
              />
            ))}
          </ol>
        </div>
      </section>

      <section
        aria-labelledby="totals-title"
        className="grid gap-3 rounded-md border border-line bg-card p-4"
      >
        <h2 id="totals-title" className="caps text-pencil">
          Totaux imprimés
        </h2>
        <dl className="grid w-full max-w-72 grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm tabular-nums">
          <dt className="text-pencil">Total HT</dt>
          <dd className="text-right">{money(draft.totals.htCentimes)}</dd>
          <dt className="text-pencil">TVA</dt>
          <dd className="text-right">{money(draft.totals.tvaCentimes)}</dd>
          <dt className="border-t border-ink pt-1 font-semibold">Total TTC</dt>
          <dd className="border-t border-ink pt-1 text-right font-semibold">
            {money(draft.totals.ttcCentimes)}
          </dd>
        </dl>
      </section>
    </>
  );
}

function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid content-start gap-0.5">
      <dt className="text-xs text-pencil">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function CheckedLine({
  line,
  known,
  withTax,
}: {
  line: DraftLine;
  known: Map<string, DraftProduct>;
  withTax: boolean;
}) {
  const created = line.match === 'new_product' ? line.newProduct : null;
  const product = line.productId ? known.get(line.productId) : undefined;
  const name = created?.name ?? product?.name ?? null;
  const selling = created ? created.priceHtCentimes : product?.priceHtCentimes;
  const unit = created?.unit || product?.unit || 'pièce';
  const price = line.unitPriceCentimes;
  const cost =
    price === null || (withTax && line.tvaRateBp === null)
      ? null
      : withTax
        ? htFromTtcCentimes(price, line.tvaRateBp ?? 0)
        : price;
  const score = line.candidates.find(
    (candidate) => candidate.productId === line.productId,
  )?.score;
  const chip =
    line.match === 'closest_name' && score !== undefined
      ? `${MATCH_LABELS.closest_name} ${scoreText(score)}`
      : MATCH_LABELS[line.match ?? 'manual'];

  return (
    <li className="grid gap-2 px-3 py-3 lg:py-2.5">
      <div className={cn(LINE_GRID, line.ignored && 'opacity-60')}>
        <span className="col-span-2 font-mono text-xs wrap-break-word lg:col-span-1 lg:pt-0.5">
          {line.label}
          {line.reference && (
            <span className="ref block text-pencil">{line.reference}</span>
          )}
        </span>
        <Cell label="Qté">{quantityText(line.quantity)}</Cell>
        <Cell label={withTax ? 'PU TTC' : 'PU HT'}>{money(price)}</Cell>
        <Cell label="TVA" left>
          {line.tvaRateBp === null ? '—' : formatRate(line.tvaRateBp)}
        </Cell>
        <Cell label={withTax ? 'Total TTC' : 'Total HT'}>
          {money(line.lineTotalCentimes)}
        </Cell>
      </div>
      {line.ignored ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <MatchChip tone="closed">Ignorée</MatchChip>
          <span className="text-xs text-pencil">
            {'Ligne ignorée : jamais enregistrée.'}
          </span>
        </div>
      ) : (
        <div className="grid gap-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold">{name ?? '—'}</span>
            <MatchChip>{chip}</MatchChip>
          </div>
          {selling !== undefined && selling !== null && cost !== null && (
            <MarginLine
              sellingHtCentimes={selling}
              costHtCentimes={cost}
              unit={unit}
            />
          )}
        </div>
      )}
    </li>
  );
}

function Cell({
  label,
  left = false,
  children,
}: {
  label: string;
  left?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-0.5">
      <span className={CELL_LABEL}>{label}</span>
      <span className={cn('tabular-nums', !left && 'lg:text-right')}>
        {children}
      </span>
    </div>
  );
}

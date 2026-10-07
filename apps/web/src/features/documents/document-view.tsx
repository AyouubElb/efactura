import { formatMoney, formatQuantity, formatRate } from '@efactura/shared';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { DocumentKind, PrintedDocument, TvaRow } from './documents.types';

const IN_WORDS: Record<DocumentKind, string> = {
  quote: 'Arrêté le présent devis à la somme de :',
  invoice: 'Arrêtée la présente facture à la somme de :',
  credit_note: 'Arrêté le présent avoir à la somme de :',
};

// The document as its PDF prints it: lines, totals, the total in words, the notes
export function DocumentView({
  kind,
  document,
}: {
  kind: DocumentKind;
  document: PrintedDocument;
}) {
  const { lines, notes, totalInWords } = document;
  return (
    <section className="grid min-w-0 content-start self-start rounded-md border border-line bg-card">
      <div className="hidden lg:block">
        <Table aria-label="Lignes du document">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Désignation</TableHead>
              <TableHead className="text-right">Qté</TableHead>
              <TableHead className="text-right">PU HT</TableHead>
              <TableHead className="text-right">TVA</TableHead>
              <TableHead className="text-right">Total HT</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line) => (
              <TableRow key={line.position} className="hover:bg-transparent">
                <TableCell className="min-w-56 whitespace-normal">
                  {line.label}
                  {line.reference && (
                    <span className="ref block text-pencil">
                      {line.reference}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {formatQuantity(line.quantity)}{' '}
                  <span className="text-pencil">{line.unit}</span>
                </TableCell>
                <TableCell className="text-right">
                  {formatMoney(line.unitPriceHtCentimes)}
                </TableCell>
                <TableCell className="text-right">
                  {formatRate(line.tvaRateBp)}
                </TableCell>
                <TableCell className="text-right">
                  {formatMoney(line.lineTotalHtCentimes)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul
        aria-label="Lignes du document"
        className="divide-y divide-line lg:hidden"
      >
        {lines.map((line) => (
          <li
            key={line.position}
            className="grid gap-1 px-3 py-2.5 tabular-nums"
          >
            <span className="flex items-start justify-between gap-3">
              <span className="min-w-0 font-semibold">
                {line.label}
                {line.reference && (
                  <span className="ref block font-normal text-pencil">
                    {line.reference}
                  </span>
                )}
              </span>
              <span className="whitespace-nowrap">
                {formatMoney(line.lineTotalHtCentimes)}
              </span>
            </span>
            <span className="text-label text-pencil">
              {formatQuantity(line.quantity)} {line.unit} ×{' '}
              {formatMoney(line.unitPriceHtCentimes)} HT ·{' '}
              {formatRate(line.tvaRateBp)}
            </span>
          </li>
        ))}
      </ul>

      <div className="grid gap-4 border-t border-line p-4">
        <Totals
          totalHtCentimes={document.totalHtCentimes}
          tvaBreakdown={document.tvaBreakdown}
          totalTtcCentimes={document.totalTtcCentimes}
        />
        {totalInWords && (
          <p className="text-sm">
            {IN_WORDS[kind]}{' '}
            <span className="font-semibold">{totalInWords} TTC.</span>
          </p>
        )}
        {notes && (
          <p className="text-sm whitespace-pre-line text-pencil">{notes}</p>
        )}
      </div>
    </section>
  );
}

export function Totals({
  totalHtCentimes,
  tvaBreakdown,
  totalTtcCentimes,
}: {
  totalHtCentimes: number;
  tvaBreakdown: TvaRow[];
  totalTtcCentimes: number;
}) {
  return (
    <dl className="ml-auto grid w-full max-w-72 grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm tabular-nums">
      <dt className="text-pencil">Total HT</dt>
      <dd className="text-right">{formatMoney(totalHtCentimes)}</dd>
      {tvaBreakdown.map((row) => (
        <TvaLine key={row.rateBp} row={row} />
      ))}
      <dt className="border-t border-ink pt-1 font-semibold">Total TTC</dt>
      <dd className="border-t border-ink pt-1 text-right font-semibold">
        {formatMoney(totalTtcCentimes)}
      </dd>
    </dl>
  );
}

function TvaLine({ row }: { row: TvaRow }) {
  return (
    <>
      <dt className="text-pencil">TVA {formatRate(row.rateBp)}</dt>
      <dd className="text-right">{formatMoney(row.tvaCentimes)}</dd>
    </>
  );
}

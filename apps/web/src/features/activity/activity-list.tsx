import Link from 'next/link';
import { EmptyState } from '@/components/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { documentPath } from '@/features/documents/documents.labels';
import type {
  DocumentKind,
  HistoryEntry,
} from '@/features/documents/documents.types';
import { sentence } from '@/lib/action-result';
import { momentInMorocco } from '@/lib/format';

const DOCUMENT_KINDS: readonly string[] = ['quote', 'invoice', 'credit_note'];

function isDocument(type: string): type is DocumentKind {
  return DOCUMENT_KINDS.includes(type);
}

// An entry about a devis, facture or avoir opens it; a deleted draft's opens the not-found page
function What({ entry }: { entry: HistoryEntry }) {
  const text = sentence(entry.summary);
  return isDocument(entry.entityType) ? (
    <Link
      href={documentPath(entry.entityType, entry.entityId)}
      className="link"
    >
      {text}
    </Link>
  ) : (
    text
  );
}

function who(entry: HistoryEntry): string {
  return entry.user?.fullName ?? 'eFactura';
}

export function ActivityList({ entries }: { entries: HistoryEntry[] }) {
  if (entries.length === 0) {
    return (
      <EmptyState title="Rien pour l'instant.">
        Chaque action de l&apos;équipe s&apos;inscrit ici{' '}: qui, quoi,
        quand.
      </EmptyState>
    );
  }
  return (
    <div className="min-w-0 rounded-md border border-line bg-card">
      <div className="hidden lg:block">
        <Table aria-label="Activité de la boutique">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Date</TableHead>
              <TableHead>Personne</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{momentInMorocco(entry.createdAt)}</TableCell>
                <TableCell>{who(entry)}</TableCell>
                <TableCell className="whitespace-normal">
                  <What entry={entry} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ol
        aria-label="Activité de la boutique"
        className="divide-y divide-line lg:hidden"
      >
        {entries.map((entry) => (
          <li key={entry.id} className="grid gap-0.5 px-3 py-2.5 text-label">
            <span className="text-xs text-pencil tabular-nums">
              {momentInMorocco(entry.createdAt)} · {who(entry)}
            </span>
            <span>
              <What entry={entry} />
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

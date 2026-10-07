import { sentence } from '@/lib/action-result';
import { momentInMorocco } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { HistoryEntry } from './documents.types';

export function SideCard({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        'grid content-start gap-2 rounded-md border border-line bg-card p-4 text-label',
        className,
      )}
    >
      <h2 className="caps text-pencil">{title}</h2>
      {children}
    </section>
  );
}

function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Newest first; an entry without a person was written by the app itself, such as an e-mail leaving
export function HistoryCard({ entries }: { entries: HistoryEntry[] }) {
  return (
    <SideCard title="Historique">
      {entries.length === 0 ? (
        <p className="text-xs text-pencil">Rien pour l&apos;instant.</p>
      ) : (
        <ol className="grid gap-3">
          {entries.map((entry) => (
            <li key={entry.id} className="grid gap-0.5">
              <time
                dateTime={entry.createdAt}
                className="text-xs text-pencil tabular-nums"
              >
                {momentInMorocco(entry.createdAt)}
              </time>
              <span>
                {entry.user
                  ? `${entry.user.fullName} ${sentence(entry.summary)}`
                  : capitalized(sentence(entry.summary))}
              </span>
            </li>
          ))}
        </ol>
      )}
    </SideCard>
  );
}

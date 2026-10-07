import Link from 'next/link';
import { formatMoney } from '@efactura/shared';
import type { Amount, DashboardTotals } from './dashboard.types';

// 0 and 1 take the singular in French
function count(n: number, one: string, many: string): string {
  return `${n} ${n > 1 ? many : one}`;
}

export function MoneyCards({ totals }: { totals: DashboardTotals }) {
  const { collectedThisMonth, waiting, late, purchasesThisMonth } = totals;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MoneyCard
        title="Encaissé ce mois"
        amount={collectedThisMonth}
        note={count(
          collectedThisMonth.count,
          'facture marquée payée',
          'factures marquées payées',
        )}
      />
      <MoneyCard
        title="En attente"
        amount={waiting}
        note={count(
          waiting.count,
          'facture envoyée, pas encore due',
          'factures envoyées, pas encore dues',
        )}
      />
      <MoneyCard
        title="En retard"
        amount={late}
        late={late.count > 0}
        note={
          late.count > 0 ? (
            <Link href="/invoices?status=late" className="link">
              {late.count > 1
                ? `Voir les ${late.count} factures`
                : 'Voir la facture'}
            </Link>
          ) : (
            'Aucune facture en retard.'
          )
        }
      />
      <MoneyCard
        title="Achats du mois"
        amount={purchasesThisMonth}
        note={count(purchasesThisMonth.count, 'achat validé', 'achats validés')}
      />
    </div>
  );
}

function MoneyCard({
  title,
  amount,
  note,
  late = false,
}: {
  title: string;
  amount: Amount;
  note: React.ReactNode;
  late?: boolean;
}) {
  return (
    <section className="grid content-start gap-1 rounded-md border border-line bg-card p-4">
      <h2 className="caps text-pencil">{title}</h2>
      <p
        className={
          late
            ? 'text-2xl font-bold text-red tabular-nums'
            : 'text-2xl font-bold tabular-nums'
        }
      >
        {formatMoney(amount.totalTtcCentimes)}
      </p>
      <p className="text-xs text-pencil">{note}</p>
    </section>
  );
}

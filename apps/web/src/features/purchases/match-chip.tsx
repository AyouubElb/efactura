import { formatMoney } from '@efactura/shared';
import { cn } from '@/lib/utils';

const TONES = {
  found: 'bg-main-tint text-main-text',
  todo: 'bg-amber-tint text-amber',
  closed: 'bg-muted-bg text-pencil',
} as const;

// How a line's product was found: Nom enregistré, Référence, Nom proche, À choisir…
export function MatchChip({
  tone = 'found',
  children,
}: {
  tone?: keyof typeof TONES;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-xs px-1.5 py-px text-caps font-bold whitespace-nowrap',
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

// "Vendu 3 575,00 HT · marge 325,00 par pièce", red when the shop would sell at a loss
export function MarginLine({
  sellingHtCentimes,
  costHtCentimes,
  unit,
  showPrice = true,
}: {
  sellingHtCentimes: number;
  costHtCentimes: number;
  unit: string;
  showPrice?: boolean;
}) {
  const margin = sellingHtCentimes - costHtCentimes;
  return (
    <p
      className={cn(
        'text-xs tabular-nums',
        margin < 0 ? 'text-red' : 'text-pencil',
      )}
    >
      {showPrice && `Vendu ${formatMoney(sellingHtCentimes)} HT · `}
      {`${showPrice ? 'marge' : 'Marge'} ${formatMoney(margin)} par ${unit}`}
    </p>
  );
}

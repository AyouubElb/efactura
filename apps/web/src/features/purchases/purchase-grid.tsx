import { dayInMorocco } from '@/lib/format';

// A line's columns, the same while it is reviewed and once validated
export const LINE_GRID =
  'grid grid-cols-2 gap-x-3 gap-y-2 lg:grid-cols-[minmax(0,1fr)_4.5rem_6.5rem_5.5rem_7rem] lg:items-start';
export const CELL_LABEL = 'caps text-pencil lg:sr-only';

// The review screen's frame: the original on the left, the rest on the right
export function PurchaseGrid({
  original,
  children,
}: {
  original: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.5fr)]">
      <div className="min-w-0 lg:sticky lg:top-4">{original}</div>
      <div className="grid min-w-0 content-start gap-4">{children}</div>
    </div>
  );
}

// "Atlas Distribution, F-0412"; until the AI has read it, the day it came in
export function PurchaseTitle({
  supplierName,
  number,
  createdAt,
}: {
  supplierName: string | null;
  number: string | null;
  createdAt: string;
}) {
  if (!supplierName && !number) {
    return <>Achat importé le {dayInMorocco(createdAt)}</>;
  }
  return (
    <>
      {supplierName ?? 'Fournisseur non lu'}
      {number && (
        <>
          , <span className="ref">{number}</span>
        </>
      )}
    </>
  );
}

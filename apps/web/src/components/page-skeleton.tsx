import { Skeleton } from '@/components/ui/skeleton';
import { WakingBanner } from '@/components/waking-banner';

export function PageSkeleton({
  shape = 'list',
}: {
  shape?: 'list' | 'dashboard' | 'form' | 'editor' | 'document' | 'review';
}) {
  return (
    <div className="grid gap-6" aria-busy="true">
      <span className="sr-only">Chargement de la page</span>
      <div className="grid gap-2">
        <Skeleton className="w-24" />
        <Skeleton className="h-6 w-48" />
      </div>
      <WakingBanner className="max-w-2xl" />
      {shape === 'dashboard' && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((tile) => (
            <div
              key={tile}
              className="grid gap-3 rounded-md border border-line bg-card p-4"
            >
              <Skeleton className="w-28" />
              <Skeleton className="h-6 w-32" />
            </div>
          ))}
        </div>
      )}
      {shape === 'list' && <ListRows />}
      {shape === 'form' && <FormBlocks />}
      {shape === 'editor' && (
        <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="grid content-start gap-6">
            <Skeleton className="h-9 max-w-md" />
            <ListRows />
          </div>
          <SideBlocks count={1} />
        </div>
      )}
      {shape === 'document' && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <ListRows />
          <SideBlocks count={3} />
        </div>
      )}
      {shape === 'review' && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.5fr)]">
          <Skeleton className="h-64 rounded-md lg:h-[28rem]" />
          <div className="grid content-start gap-4">
            <SideBlocks count={1} />
            <ListRows />
          </div>
        </div>
      )}
    </div>
  );
}

function SideBlocks({ count }: { count: number }) {
  return (
    <div className="grid content-start gap-4">
      {Array.from({ length: count }, (_, block) => (
        <div
          key={block}
          className="grid gap-3 rounded-md border border-line bg-card p-4"
        >
          <Skeleton className="w-24" />
          <Skeleton className="w-40" />
        </div>
      ))}
    </div>
  );
}

// Inside a page: the title and tabs are drawn, only the rows wait
export function ListSkeleton() {
  return (
    <div className="grid gap-3" aria-busy="true">
      <span className="sr-only">Chargement de la liste</span>
      <WakingBanner className="max-w-2xl" />
      <ListRows />
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="grid gap-3" aria-busy="true">
      <span className="sr-only">Chargement du formulaire</span>
      <WakingBanner className="max-w-2xl" />
      <FormBlocks />
    </div>
  );
}

function FormBlocks() {
  return (
    <div className="grid max-w-2xl gap-5 rounded-md border border-line bg-card p-4">
      {[0, 1, 2].map((group) => (
        <div key={group} className="grid gap-3">
          <Skeleton className="w-32" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ListRows() {
  return (
    <div className="grid gap-3 rounded-md border border-line bg-card p-3">
      {[0, 1, 2, 3, 4].map((row) => (
        <div
          key={row}
          className="grid grid-cols-[110px_1fr_90px] gap-3 sm:grid-cols-[110px_1fr_90px_70px]"
        >
          <Skeleton />
          <Skeleton />
          <Skeleton />
          <Skeleton className="hidden sm:block" />
        </div>
      ))}
    </div>
  );
}

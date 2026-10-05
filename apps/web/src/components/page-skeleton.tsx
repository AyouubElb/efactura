import { Skeleton } from '@/components/ui/skeleton';
import { WakingBanner } from '@/components/waking-banner';

export function PageSkeleton({
  shape = 'list',
}: {
  shape?: 'list' | 'dashboard';
}) {
  return (
    <div className="grid gap-6" aria-busy="true">
      <span className="sr-only">Chargement de la page</span>
      <div className="grid gap-2">
        <Skeleton className="w-24" />
        <Skeleton className="h-6 w-48" />
      </div>
      <WakingBanner className="max-w-2xl" />
      {shape === 'dashboard' ? (
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
      ) : (
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
      )}
    </div>
  );
}

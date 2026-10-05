import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('h-3 animate-pulse rounded-xs bg-muted-bg', className)}
      {...props}
    />
  );
}

export { Skeleton };

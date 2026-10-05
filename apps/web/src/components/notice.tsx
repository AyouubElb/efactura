import { Stamp, type StampTone } from '@/components/stamp';
import { cn } from '@/lib/utils';

const BORDERS: Record<StampTone, string> = {
  closed: 'border-pencil',
  draft: 'border-pencil',
  way: 'border-main-text',
  check: 'border-amber',
  done: 'border-green',
  act: 'border-red',
};

export function Notice({
  tone,
  stamp,
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & { tone: StampTone; stamp: string }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border-[1.5px] bg-card px-3 py-2 text-sm text-ink',
        BORDERS[tone],
        className,
      )}
      {...props}
    >
      <Stamp tone={tone}>{stamp}</Stamp>
      <span className="min-w-0">{children}</span>
    </div>
  );
}

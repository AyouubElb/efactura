import { cn } from '@/lib/utils';

// One family per meaning: closed, not stamped yet, on its way, check soon, done, act now
const TONES = {
  closed: 'text-pencil',
  draft: 'border-dashed text-pencil',
  way: 'text-main-text',
  check: 'text-amber',
  done: 'text-green',
  act: 'text-red',
} as const;

export type StampTone = keyof typeof TONES;

export function Stamp({
  tone,
  className,
  ...props
}: React.ComponentProps<'span'> & { tone: StampTone }) {
  return (
    <span
      data-slot="stamp"
      className={cn(
        'inline-flex items-center rounded-xs border-[1.5px] border-current bg-card px-1.5 py-0.5 text-stamp font-bold whitespace-nowrap uppercase',
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}

import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block justify-self-start rounded-xs border-[1.5px] border-main-text px-2 py-0.5 font-mono text-sm font-semibold text-main-text',
        className,
      )}
    >
      eFactura
    </span>
  );
}

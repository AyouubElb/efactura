import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function MoneyInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  return (
    <div className="flex">
      <Input
        inputMode="decimal"
        autoComplete="off"
        className={cn('rounded-r-none text-right tabular-nums', className)}
        {...props}
      />
      <span
        aria-hidden
        className="grid place-items-center rounded-r-md border-[1.5px] border-l-0 border-field bg-muted-bg px-2.5 text-label font-semibold text-pencil"
      >
        MAD
      </span>
    </div>
  );
}

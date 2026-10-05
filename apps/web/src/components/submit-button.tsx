'use client';

import { CircleNotchIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// A working button keeps its colour and says what it does: "Connexion en cours"
export function SubmitButton({
  pending,
  pendingLabel,
  className,
  children,
  ...props
}: React.ComponentProps<typeof Button> & {
  pending: boolean;
  pendingLabel: string;
}) {
  return (
    <Button
      type="submit"
      aria-disabled={pending || undefined}
      className={cn(pending && 'pointer-events-none', className)}
      {...props}
    >
      {pending && <CircleNotchIcon className="animate-spin" aria-hidden />}
      {pending ? pendingLabel : children}
    </Button>
  );
}

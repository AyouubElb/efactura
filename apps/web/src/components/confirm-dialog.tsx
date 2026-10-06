'use client';

import { useState, useTransition } from 'react';
import { CircleNotchIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FieldError } from '@/components/ui/field';
import { WakingBanner } from '@/components/waking-banner';
import { cn } from '@/lib/utils';

// A question, its consequence, and two explicit answers; the red one does it
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  children,
  keepLabel,
  confirmLabel,
  pendingLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  children: React.ReactNode;
  keepLabel: string;
  confirmLabel: string;
  pendingLabel: string;
  onConfirm: () => Promise<string | null>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    if (pending) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const failure = await onConfirm();
      startTransition(() => {
        if (failure) {
          setError(failure);
        } else {
          onOpenChange(false);
        }
      });
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) {
          setError(null);
          onOpenChange(next);
        }
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogDescription asChild className="grid gap-2 text-sm text-ink">
          <div>{children}</div>
        </DialogDescription>
        {error && <FieldError>{error}</FieldError>}
        {pending && <WakingBanner />}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={pending}>
              {keepLabel}
            </Button>
          </DialogClose>
          <Button
            variant="dangerFill"
            onClick={confirm}
            aria-disabled={pending || undefined}
            className={cn(pending && 'pointer-events-none')}
          >
            {pending && (
              <CircleNotchIcon className="animate-spin" aria-hidden />
            )}
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

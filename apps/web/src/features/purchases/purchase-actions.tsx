'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { SubmitButton } from '@/components/submit-button';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field';
import { discardPurchase, retryRead } from './purchases.actions';

// Nothing was saved yet, and the same file can come back: still asked first
export function DiscardDialog({
  id,
  open,
  onOpenChange,
}: {
  id: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Écarter cet achat ?"
      keepLabel="Garder l'achat"
      confirmLabel="Écarter l'achat"
      pendingLabel="Mise à l'écart en cours"
      onConfirm={async () => {
        const result = await discardPurchase(id);
        if (!result.ok) {
          return result.error;
        }
        toast.success('Achat écarté.');
        return null;
      }}
    >
      <p>
        {
          "Rien n'est enregistré. Il reste dans « Écartés », et le même fichier pourra être importé à nouveau."
        }
      </p>
    </ConfirmDialog>
  );
}

// A read that failed: read it again, or set it aside
export function FailedActions({ id }: { id: string }) {
  const [discarding, setDiscarding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function retry() {
    if (pending) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await retryRead(id);
      if (!result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="grid justify-items-end gap-1">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setDiscarding(true)}
        >
          Écarter
        </Button>
        <SubmitButton
          type="button"
          onClick={retry}
          pending={pending}
          pendingLabel="Lecture en cours"
        >
          Relire
        </SubmitButton>
      </div>
      {error && <FieldError>{error}</FieldError>}
      <DiscardDialog id={id} open={discarding} onOpenChange={setDiscarding} />
    </div>
  );
}

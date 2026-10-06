'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import type { ActionFailure } from '@/lib/action-result';

type SetArchived = (
  id: string,
  archived: boolean,
) => Promise<{ ok: true; data: { name: string } } | ActionFailure>;

// noun: "Produit", "Client", "Fournisseur"
export function useArchive(setArchived: SetArchived, noun: string) {
  const [, startTransition] = useTransition();

  return (id: string, archived: boolean) => {
    const toastId = toast.loading(
      archived ? 'Archivage en cours' : 'Restauration en cours',
    );
    startTransition(async () => {
      const result = await setArchived(id, archived);
      if (result.ok) {
        toast.success(
          `${noun} ${result.data.name} ${archived ? 'archivé' : 'restauré'}.`,
          { id: toastId },
        );
      } else {
        toast.error(result.error, { id: toastId });
      }
    });
  };
}

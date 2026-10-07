'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { dayInMorocco, momentInMorocco } from '@/lib/format';
import type { ShareLink } from './documents.types';
import { revokeLink } from './links.actions';
import { SideCard } from './side-cards';

// The private link of the WhatsApp message: who opened it, and how to stop it
export function LinkCard({
  link,
  isAdmin,
}: {
  link: ShareLink;
  isAdmin: boolean;
}) {
  const [asking, setAsking] = useState(false);
  const { openCount, lastOpenedAt } = link;

  return (
    <SideCard title="Lien WhatsApp">
      <p>
        {openCount === 0 || !lastOpenedAt
          ? 'Pas encore ouvert.'
          : `Ouvert ${openCount === 1 ? 'une fois' : `${openCount} fois`}, la dernière le ${moment(lastOpenedAt)}.`}
      </p>
      <p className="text-xs text-pencil">
        Valable jusqu&apos;au {dayInMorocco(link.expiresAt)}.
      </p>
      {isAdmin && (
        <>
          <Button
            variant="quiet"
            className="justify-self-start px-0 text-red"
            onClick={() => setAsking(true)}
          >
            Désactiver le lien
          </Button>
          <ConfirmDialog
            open={asking}
            onOpenChange={setAsking}
            title="Désactiver le lien de ce document ?"
            keepLabel="Garder le lien"
            confirmLabel="Oui, désactiver le lien"
            pendingLabel="Désactivation en cours"
            onConfirm={async () => {
              const result = await revokeLink(link.id);
              if (!result.ok) {
                return result.error;
              }
              toast.success('Lien désactivé.');
              return null;
            }}
          >
            <p>
              Le lien déjà envoyé ne s&apos;ouvrira plus.
              «&#8239;Renvoyer&#8239;» par WhatsApp en crée un nouveau.
            </p>
          </ConfirmDialog>
        </>
      )}
    </SideCard>
  );
}

// "06/10/2026 11:05" → "06/10/2026 à 11:05"
function moment(when: string): string {
  return momentInMorocco(when).replace(' ', ' à ');
}

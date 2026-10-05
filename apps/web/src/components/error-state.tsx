'use client';

import { Button } from '@/components/ui/button';

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <section
      role="alert"
      className="grid max-w-2xl justify-items-start gap-2 rounded-md border border-red bg-card p-6"
    >
      <h2 className="font-mono text-subtitle">
        Cette page n&apos;a pas pu s&apos;afficher
      </h2>
      <p className="text-pencil">
        Rien n&apos;a été perdu. Réessayez dans un instant.
      </p>
      <Button variant="secondary" onClick={onRetry} className="mt-2">
        Réessayer
      </Button>
    </section>
  );
}

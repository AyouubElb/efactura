'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Notice } from '@/components/notice';

const EVERY_MS = 2_000;
const SLOW_AFTER_MS = 30_000;

// The app's one automatic request: the page asks again until the read ends, never two at once
export function ReadingWait() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [slow, setSlow] = useState(false);
  const asking = useRef(false);

  useEffect(() => {
    asking.current = pending;
  }, [pending]);

  useEffect(() => {
    const slowTimer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    const timer = setInterval(() => {
      if (!asking.current && document.visibilityState === 'visible') {
        startTransition(() => router.refresh());
      }
    }, EVERY_MS);
    return () => {
      clearTimeout(slowTimer);
      clearInterval(timer);
    };
  }, [router]);

  return (
    <div className="grid content-start gap-3" aria-live="polite">
      <Notice tone="way" stamp="Lecture en cours">
        {"L'IA lit la facture. Cela prend 10 à 30 secondes."}
      </Notice>
      <p className="text-pencil">
        {'Vous pouvez quitter la page : la lecture continue.'}
      </p>
      {slow && (
        <p className="text-pencil">
          {"Cela peut prendre une minute de plus si l'application démarrait."}
        </p>
      )}
    </div>
  );
}

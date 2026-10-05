'use client';

import { useEffect, useState } from 'react';
import { Notice } from '@/components/notice';

const SHOW_AFTER_MS = 5_000;

export function WakingBanner({ className }: { className?: string }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShown(true), SHOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!shown) {
    return null;
  }
  return (
    <Notice role="status" tone="way" stamp="Patience" className={className}>
      L&apos;application démarre. La page s&apos;affiche dans une minute
      environ.
    </Notice>
  );
}

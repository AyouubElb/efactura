'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

const RETRY_EVERY_MS = 3_000;
const LONGER_THAN_USUAL_MS = 3 * 60_000;

export function StartingWatcher() {
  const router = useRouter();
  const [checking, startTransition] = useTransition();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (checking) {
      return;
    }
    const timer = setTimeout(
      () => startTransition(() => router.refresh()),
      RETRY_EVERY_MS,
    );
    return () => clearTimeout(timer);
  }, [checking, router]);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), LONGER_THAN_USUAL_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!slow) {
    return null;
  }
  return (
    <p role="status" className="text-xs text-pencil">
      Cela prend plus de temps que d&apos;habitude. La page continue
      d&apos;essayer&#8239;; vous pouvez aussi revenir dans quelques minutes.
    </p>
  );
}

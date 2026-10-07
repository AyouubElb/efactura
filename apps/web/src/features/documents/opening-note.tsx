'use client';

import { useEffect, useState } from 'react';

const SHOW_AFTER_MS = 5_000;

// The free API sleeps: the client is told why the PDF takes a while
export function OpeningNote() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShown(true), SHOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <p role="status" className="text-sm text-pencil">
      {shown ? "Cela peut prendre jusqu'à une minute." : 'Un instant.'}
    </p>
  );
}

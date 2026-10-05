'use client';

import { ErrorState } from '@/components/error-state';
import { PaperPage } from '@/components/paper-card';
import { fontVariables } from '@/lib/fonts';
import './globals.css';

// Replaces the root layout when even it fails, so it brings its own document and styles
export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="fr" className={fontVariables}>
      <body>
        <title>Erreur | eFactura</title>
        <PaperPage>
          <ErrorState onRetry={retry} />
        </PaperPage>
      </body>
    </html>
  );
}

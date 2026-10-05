'use client';

import { ErrorState } from '@/components/error-state';
import { PaperPage } from '@/components/paper-card';

export default function RootError({ retry }: { retry: () => void }) {
  return (
    <PaperPage>
      <ErrorState onRetry={retry} />
    </PaperPage>
  );
}

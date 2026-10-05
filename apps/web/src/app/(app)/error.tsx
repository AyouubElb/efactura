'use client';

import { ErrorState } from '@/components/error-state';

// Inside the frame: the menu stays usable
export default function AppError({ retry }: { retry: () => void }) {
  return <ErrorState onRetry={retry} />;
}

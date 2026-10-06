'use client';

import { createContext, use, useMemo, useState } from 'react';
import { PlusIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

interface PanelControls<T> {
  open: boolean;
  record: T | null;
  openNew: () => void;
  openEdit: (record: T) => void;
  close: () => void;
}

const PanelContext = createContext<PanelControls<unknown> | null>(null);

// One side panel per list page: the header's button, the rows and the panel share it
export function PanelProvider({ children }: { children: React.ReactNode }) {
  // The record stays while the panel slides out, so its form doesn't empty mid-animation
  const [state, setState] = useState<{ open: boolean; record: unknown }>({
    open: false,
    record: null,
  });
  const controls = useMemo<PanelControls<unknown>>(
    () => ({
      ...state,
      openNew: () => setState({ open: true, record: null }),
      openEdit: (record) => setState({ open: true, record }),
      close: () => setState((current) => ({ ...current, open: false })),
    }),
    [state],
  );
  return <PanelContext value={controls}>{children}</PanelContext>;
}

export function usePanel<T>(): PanelControls<T> {
  const controls = use(PanelContext);
  if (!controls) {
    throw new Error('usePanel needs a PanelProvider');
  }
  return controls as PanelControls<T>;
}

export function NewRecordButton({ children }: { children: string }) {
  const { openNew } = usePanel();
  return (
    <Button onClick={openNew} className="max-md:w-9 max-md:px-0">
      <PlusIcon />
      <span className="max-md:sr-only">{children}</span>
    </Button>
  );
}

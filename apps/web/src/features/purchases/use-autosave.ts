'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';
import { NOT_ANSWERING, type ActionResult } from '@/lib/action-result';

const WAIT_MS = 1_000;

export type SaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; at: string }
  | { kind: 'failed'; error: string };

// A second after the last change, or when a field is left; one save at a time, each with the newest values
export function useAutosave<T extends FieldValues>({
  form,
  save,
  onClosed,
}: {
  form: UseFormReturn<T>;
  save: (values: T) => Promise<ActionResult<{ savedAt: string }>>;
  // Validated or set aside elsewhere meanwhile
  onClosed: () => void;
}) {
  const [state, setState] = useState<SaveState>({ kind: 'idle' });
  const [start] = useState(() => JSON.stringify(form.getValues()));
  const lastSaved = useRef(start);
  const queue = useRef<Promise<boolean>>(Promise.resolve(true));
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // True once everything on screen is saved
  const flush = useCallback((): Promise<boolean> => {
    clearTimeout(timer.current);
    const next = queue.current.then(async () => {
      const values = form.getValues();
      const json = JSON.stringify(values);
      if (json === lastSaved.current) {
        return true;
      }
      setState({ kind: 'saving' });
      let result: ActionResult<{ savedAt: string }>;
      try {
        result = await save(values);
      } catch {
        result = { ok: false, error: NOT_ANSWERING };
      }
      if (!result.ok) {
        setState({ kind: 'failed', error: result.error });
        if (result.code === 'NOT_EDITABLE') {
          onClosed();
        }
        return false;
      }
      lastSaved.current = json;
      setState({ kind: 'saved', at: result.data.savedAt });
      return JSON.stringify(form.getValues()) === json;
    });
    queue.current = next;
    return next;
  }, [form, save, onClosed]);

  useEffect(() => {
    const unsubscribe = form.subscribe({
      formState: { values: true },
      callback: () => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => void flush(), WAIT_MS);
      },
    });
    return () => {
      unsubscribe();
      clearTimeout(timer.current);
    };
  }, [form, flush]);

  // A reload or a closed tab asks first while a change waits
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (JSON.stringify(form.getValues()) !== lastSaved.current) {
        event.preventDefault();
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [form]);

  return { state, flush };
}

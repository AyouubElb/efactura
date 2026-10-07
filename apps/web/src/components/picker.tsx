'use client';

import { useEffect, useState } from 'react';
import { CircleNotchIcon, MagnifyingGlassIcon } from '@phosphor-icons/react';
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const WAIT_MS = 300;
const NOT_ANSWERING = 'La recherche ne répond pas. Réessayez dans un instant.';
const ACTION = 'picker-action';

export interface PickerAction {
  label: string;
  onSelect: () => void;
}

interface Found<T> {
  text: string;
  items: T[];
}

export interface PickerSuggestions<T> {
  label: string;
  items: T[];
}

// Searches the server as you type, through the web's own /search address: the browser never calls the API
export function Picker<T extends { id: string }>({
  list,
  open,
  onOpenChange,
  trigger,
  label,
  placeholder,
  renderItem,
  onPick,
  noMatch,
  action,
  suggestions,
  align = 'start',
  className,
}: {
  list: 'clients' | 'products' | 'suppliers';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
  label: string;
  placeholder: string;
  renderItem: (item: T) => React.ReactNode;
  onPick: (item: T) => void;
  noMatch: (text: string) => string;
  // The last row, such as "Créer le client « riad »"
  action?: (text: string) => PickerAction | null;
  // Shown before any typing, instead of the first rows by name
  suggestions?: PickerSuggestions<T>;
  align?: 'start' | 'end';
  className?: string;
}) {
  const [text, setText] = useState('');
  const [found, setFound] = useState<Found<T> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  // The row Enter picks: the best match, else the last row's action
  const [active, setActive] = useState('');
  const suggesting = !text.trim() && (suggestions?.items.length ?? 0) > 0;

  useEffect(() => {
    if (!open || suggesting) {
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(
      async () => {
        setSearching(true);
        try {
          const response = await fetch(
            `/search/${list}?text=${encodeURIComponent(text.trim())}`,
            {
              signal: controller.signal,
              headers: { Accept: 'application/json' },
            },
          );
          const body: unknown = await response.json().catch(() => null);
          if (response.ok && hasItems<T>(body)) {
            setFound({ text: text.trim(), items: body.items });
            setActive(body.items[0]?.id ?? ACTION);
            setError(null);
          } else {
            setError(errorOf(body));
          }
        } catch {
          if (!controller.signal.aborted) {
            setError(NOT_ANSWERING);
          }
        } finally {
          if (!controller.signal.aborted) {
            setSearching(false);
          }
        }
      },
      text ? WAIT_MS : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, text, list, suggesting]);

  function changeOpen(next: boolean) {
    if (!next) {
      setText('');
      setFound(null);
      setError(null);
    } else {
      setActive(suggestions?.items[0]?.id ?? '');
    }
    onOpenChange(next);
  }

  function changeText(next: string) {
    setText(next);
    if (!next.trim()) {
      setActive(suggestions?.items[0]?.id ?? '');
    }
  }

  const last = action?.(text.trim()) ?? null;
  const rows = suggesting
    ? (suggestions?.items ?? [])
    : error
      ? []
      : (found?.items ?? []);
  const icon = searching ? (
    <CircleNotchIcon
      aria-hidden
      className="size-3.5 animate-spin text-pencil"
    />
  ) : (
    <MagnifyingGlassIcon aria-hidden className="size-3.5 text-pencil" />
  );

  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align={align} className={className ?? 'w-80'}>
        <Command
          shouldFilter={false}
          label={label}
          loop
          value={active}
          onValueChange={setActive}
        >
          <CommandInput
            value={text}
            onValueChange={changeText}
            placeholder={placeholder}
            maxLength={100}
            icon={icon}
          />
          <CommandList>
            {suggesting ? (
              <p className="caps px-2 pt-2 pb-1 text-pencil">
                {suggestions?.label}
              </p>
            ) : error ? (
              <p role="alert" className="px-2 py-2 text-label text-red">
                {error}
              </p>
            ) : !found ? (
              <p className="px-2 py-2 text-label text-pencil">Recherche…</p>
            ) : (
              found.items.length === 0 && (
                <p className="px-2 py-2 text-label text-pencil">
                  {noMatch(found.text)}
                </p>
              )
            )}
            {rows.map((item) => (
              <CommandItem
                key={item.id}
                value={item.id}
                onSelect={() => {
                  onPick(item);
                  changeOpen(false);
                }}
              >
                {renderItem(item)}
              </CommandItem>
            ))}
            {last && (
              <>
                {rows.length > 0 && <CommandSeparator />}
                <CommandItem
                  value={ACTION}
                  onSelect={() => {
                    changeOpen(false);
                    last.onSelect();
                  }}
                  className="font-semibold text-main-text"
                >
                  {last.label}
                </CommandItem>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function hasItems<T>(body: unknown): body is { items: T[] } {
  return (
    typeof body === 'object' &&
    body !== null &&
    Array.isArray((body as { items?: unknown }).items)
  );
}

function errorOf(body: unknown): string {
  const error = (body as { error?: unknown } | null)?.error;
  return typeof error === 'string' ? error : NOT_ANSWERING;
}

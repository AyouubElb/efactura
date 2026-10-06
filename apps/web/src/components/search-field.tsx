'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CircleNotchIcon, MagnifyingGlassIcon } from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { listHref, type ListParams } from '@/lib/list-params';

const WAIT_MS = 300;
const ICON =
  'pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-pencil';

export function SearchField({
  id,
  placeholder,
  pathname,
  params,
}: {
  id: string;
  placeholder: string;
  pathname: string;
  params: ListParams;
}) {
  const router = useRouter();
  const [value, setValue] = useState(params.search);
  // The search we last sent, updated with the navigation: any other one in the address came from Back
  const [sent, setSent] = useState(params.search);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  if (params.search !== sent) {
    setSent(params.search);
    setValue(params.search);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  function onChange(next: string) {
    setValue(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const search = next.trim();
      startTransition(() => {
        setSent(search);
        router.replace(listHref(pathname, { ...params, search, page: 1 }), {
          scroll: false,
        });
      });
    }, WAIT_MS);
  }

  return (
    <div className="relative max-w-md">
      <label htmlFor={id} className="sr-only">
        Rechercher
      </label>
      {pending ? (
        <CircleNotchIcon aria-hidden className={`${ICON} animate-spin`} />
      ) : (
        <MagnifyingGlassIcon aria-hidden className={ICON} />
      )}
      <Input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        maxLength={100}
        className="pl-8"
      />
      <span role="status" className="sr-only">
        {pending ? 'Recherche en cours' : ''}
      </span>
    </div>
  );
}

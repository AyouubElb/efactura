'use client';

import Link, { useLinkStatus } from 'next/link';
import { CircleNotchIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export interface FilterTab {
  label: string;
  href: string;
  current: boolean;
}

export function FilterTabs({
  label,
  tabs,
}: {
  label: string;
  tabs: FilterTab[];
}) {
  return (
    <nav
      aria-label={label}
      className="flex flex-wrap gap-0.5 border-b-[1.5px] border-line"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          scroll={false}
          aria-current={tab.current ? 'page' : undefined}
          className={cn(
            'mb-[-1.5px] inline-flex items-center gap-1.5 border-b-[2.5px] border-transparent px-2.5 py-1.5 text-label font-semibold text-pencil hover:text-ink',
            tab.current && 'border-main text-main-text hover:text-main-text',
          )}
        >
          {tab.label}
          <PendingHint />
        </Link>
      ))}
    </nav>
  );
}

// A sleeping API can take a minute: the clicked link says it is on its way
export function PendingHint({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  return (
    <CircleNotchIcon
      aria-hidden
      className={cn(
        'size-3 animate-spin opacity-0 transition-opacity',
        pending && 'opacity-100',
        className,
      )}
    />
  );
}

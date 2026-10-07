'use client';

import Link, { useLinkStatus } from 'next/link';
import { CircleNotchIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export interface FilterTab {
  label: string;
  href: string;
  current: boolean;
  // Documents that need acting on, such as late invoices
  count?: number;
  // 09's family: red to act now, amber to check soon
  countTone?: 'act' | 'check';
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
          {tab.count ? (
            <span
              className={cn(
                'inline-grid h-4.5 min-w-4.5 place-items-center rounded-xs px-1 text-stamp font-bold tabular-nums',
                tab.countTone === 'check'
                  ? 'bg-amber-tint text-amber'
                  : 'bg-red-tint text-red',
              )}
            >
              {tab.count}
            </span>
          ) : null}
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

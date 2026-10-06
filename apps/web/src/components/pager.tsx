'use client';

import Link from 'next/link';
import { PendingHint } from '@/components/filter-tabs';
import type { PageMeta } from '@/lib/api-core';
import { listHref, type ListParams } from '@/lib/list-params';
import { cn } from '@/lib/utils';

// 1 … 4 5 6 … 12: the first, the last, and the pages around the current one
function pageNumbers(current: number, last: number): (number | null)[] {
  const shown = new Set([1, last, current - 1, current, current + 1]);
  const numbers = [...shown]
    .filter((page) => page >= 1 && page <= last)
    .sort((a, b) => a - b);
  return numbers.flatMap((page, index) =>
    index > 0 && page - numbers[index - 1] > 1 ? [null, page] : [page],
  );
}

export function Pager({
  pathname,
  params,
  meta,
}: {
  pathname: string;
  params: ListParams;
  meta: PageMeta;
}) {
  if (meta.total === 0) {
    return null;
  }
  const last = Math.max(1, Math.ceil(meta.total / meta.pageSize));
  const from = (meta.page - 1) * meta.pageSize + 1;
  const to = Math.min(meta.page * meta.pageSize, meta.total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-pencil tabular-nums">
      <p>
        {from === to ? from : `${from} à ${to}`} sur {meta.total}
      </p>
      {last > 1 && (
        <nav aria-label="Pages" className="flex flex-wrap gap-1">
          {pageNumbers(meta.page, last).map((page, index) =>
            page === null ? (
              <span key={`gap-${index}`} className="px-1 py-1">
                …
              </span>
            ) : (
              <Link
                key={page}
                href={listHref(pathname, { ...params, page })}
                scroll={false}
                aria-label={`Page ${page}`}
                aria-current={page === meta.page ? 'page' : undefined}
                className={cn(
                  'relative inline-flex min-w-8 items-center justify-center rounded-md border-[1.5px] border-line bg-card px-2 py-1 text-xs text-ink hover:border-field',
                  page === meta.page &&
                    'border-main bg-main text-on-main hover:border-main',
                )}
              >
                {page}
                <PendingHint className="absolute -top-1.5 -right-1.5 text-main-text" />
              </Link>
            ),
          )}
        </nav>
      )}
    </div>
  );
}

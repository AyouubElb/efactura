'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { NAV_GROUPS } from './nav-items';

export function NavLinks({
  isAdmin,
  onNavigate,
}: {
  isAdmin: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Menu" className="grid gap-0.5">
      {NAV_GROUPS.filter((group) => !group.adminOnly || isAdmin).map(
        (group, index) => (
          <div key={group.label ?? index} className="grid gap-0.5">
            {group.label && (
              <p className="caps mx-2 mt-3 mb-0.5 text-pencil">{group.label}</p>
            )}
            {group.items.map((item) => {
              const active = [item.href, ...(item.also ?? [])].some(
                (href) => pathname === href || pathname.startsWith(`${href}/`),
              );
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'rounded-md px-2 py-1.5 text-ink hover:bg-paper',
                    active &&
                      'bg-main-tint font-semibold text-main-text hover:bg-main-tint',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ),
      )}
    </nav>
  );
}

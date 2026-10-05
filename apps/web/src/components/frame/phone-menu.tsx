'use client';

import { ListIcon } from '@phosphor-icons/react';
import { useRef, useState } from 'react';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { MenuContent, type FrameIdentity } from './menu-content';

export function PhoneMenu({ identity }: { identity: FrameIdentity | null }) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div className="sticky top-0 z-40 flex items-center justify-between gap-2 border-b border-line bg-card px-4 py-2 md:hidden">
      <Logo />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="secondary" size="icon" aria-label="Ouvrir le menu">
            <ListIcon />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          aria-describedby={undefined}
          className="w-[min(280px,85%)] overflow-y-auto px-3 py-4 text-sm"
          ref={contentRef}
          onOpenAutoFocus={(event) => {
            // Radix would skip the links and land on "Se déconnecter"
            event.preventDefault();
            const nav = contentRef.current?.querySelector('nav');
            const link =
              nav?.querySelector<HTMLElement>('a[aria-current="page"]') ??
              nav?.querySelector<HTMLElement>('a');
            link?.focus();
          }}
        >
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <MenuContent identity={identity} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}

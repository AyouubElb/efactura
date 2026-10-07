'use client';

import * as React from 'react';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import { Command as CommandPrimitive } from 'cmdk';
import { cn } from '@/lib/utils';

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        'flex w-full flex-col overflow-hidden bg-card text-ink',
        className,
      )}
      {...props}
    />
  );
}

function CommandInput({
  className,
  icon,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input> & {
  icon?: React.ReactNode;
}) {
  return (
    <div
      data-slot="command-input-wrapper"
      className="-mx-1.5 -mt-1.5 mb-1 flex h-9 items-center gap-2 border-b border-line px-3"
    >
      {icon ?? (
        <MagnifyingGlassIcon aria-hidden className="size-3.5 text-pencil" />
      )}
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          // 16 px on phones so the browser doesn't zoom into the field
          'h-9 w-full bg-transparent text-base text-ink outline-none placeholder:text-pencil md:text-sm',
          className,
        )}
        {...props}
      />
    </div>
  );
}

function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(
        'max-h-72 scroll-py-1 overflow-x-hidden overflow-y-auto',
        className,
      )}
      {...props}
    />
  );
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn('-mx-1.5 my-1 h-px bg-line', className)}
      {...props}
    />
  );
}

function CommandItem({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-xs px-2 py-1.5 text-label outline-none select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:text-pencil data-[selected=true]:bg-main-tint [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
        className,
      )}
      {...props}
    />
  );
}

export { Command, CommandInput, CommandItem, CommandList, CommandSeparator };

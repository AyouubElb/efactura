'use client';

import * as React from 'react';
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import { DayPicker } from 'react-day-picker';
import { fr } from 'react-day-picker/locale';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// French, Monday first, as 09 asks of every date
function Calendar({
  className,
  classNames,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      locale={fr}
      weekStartsOn={1}
      showOutsideDays
      className={cn('p-1.5', className)}
      classNames={{
        months: 'relative',
        month: 'grid gap-2',
        nav: 'absolute inset-x-0 top-0 flex items-center justify-between',
        button_previous: cn(
          buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
          'aria-disabled:pointer-events-none aria-disabled:text-pencil',
        ),
        button_next: cn(
          buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
          'aria-disabled:pointer-events-none aria-disabled:text-pencil',
        ),
        month_caption: 'flex h-8 items-center justify-center px-9',
        caption_label: 'text-label font-semibold first-letter:uppercase',
        month_grid: 'border-collapse',
        weekdays: 'flex',
        weekday: 'caps w-9 py-1 text-center text-pencil',
        week: 'flex',
        day: 'size-9 p-0 text-center',
        day_button:
          'size-9 cursor-pointer rounded-md text-label text-ink tabular-nums outline-none hover:bg-main-tint focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-main',
        today: '[&>button]:font-bold [&>button]:text-main-text',
        selected:
          '[&>button]:bg-main [&>button]:font-semibold [&>button]:text-on-main [&>button]:hover:bg-main-hover',
        outside: '[&>button]:text-pencil',
        disabled:
          '[&>button]:cursor-not-allowed [&>button]:text-field [&>button]:line-through [&>button]:hover:bg-transparent',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left' ? (
            <CaretLeftIcon aria-hidden className="size-3.5" />
          ) : (
            <CaretRightIcon aria-hidden className="size-3.5" />
          ),
      }}
      {...props}
    />
  );
}

export { Calendar };

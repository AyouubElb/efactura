'use client';

import { useState } from 'react';
import { CalendarBlankIcon } from '@phosphor-icons/react';
import { formatDate } from '@efactura/shared';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// "2026-10-06" ↔ the calendar's local midnight, so no time zone moves the day
function toDate(day: string): Date {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date);
}

function toDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function DateField({
  id,
  label,
  value,
  onChange,
  min,
  max,
  invalid = false,
  describedBy,
}: {
  id: string;
  // The field's label: the button's name also says the chosen day
  label: string;
  value: string;
  onChange: (day: string) => void;
  min?: string;
  max?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [open, setOpen] = useState(false);
  const disabled = [
    ...(min ? [{ before: toDate(min) }] : []),
    ...(max ? [{ after: toDate(max) }] : []),
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          aria-label={value ? `${label} : ${formatDate(value)}` : label}
          data-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cn(
            'flex h-9 w-full max-w-48 cursor-pointer items-center justify-between gap-2 rounded-md border-[1.5px] border-field bg-card px-3 text-base text-ink tabular-nums transition-[border-color,box-shadow] outline-none md:text-sm',
            'focus-visible:border-main focus-visible:ring-3 focus-visible:ring-main-tint',
            'data-invalid:border-red data-invalid:focus-visible:ring-red-tint',
            !value && 'text-pencil',
          )}
        >
          {value ? formatDate(value) : 'Choisir une date'}
          <CalendarBlankIcon aria-hidden className="size-4 text-pencil" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto">
        <Calendar
          mode="single"
          selected={value ? toDate(value) : undefined}
          defaultMonth={value ? toDate(value) : undefined}
          startMonth={min ? toDate(min) : undefined}
          endMonth={max ? toDate(max) : undefined}
          disabled={disabled}
          onSelect={(date) => {
            if (date) {
              onChange(toDay(date));
              setOpen(false);
            }
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}

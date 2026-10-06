'use client';

import * as React from 'react';
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn('flex flex-wrap gap-2', className)}
      {...props}
    />
  );
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border-[1.5px] border-field bg-card px-2.5 text-label font-semibold text-ink outline-none hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main disabled:cursor-not-allowed disabled:bg-muted-bg disabled:text-pencil aria-invalid:border-red data-[state=checked]:border-main data-[state=checked]:bg-main-tint data-[state=checked]:text-main-text',
        className,
      )}
      {...props}
    />
  );
}

export { RadioGroup, RadioGroupItem };

'use client';

import * as React from 'react';
import { Switch as SwitchPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

// Square, like every control in 09: nothing round
function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-md border-[1.5px] border-field bg-card px-0.5 transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main disabled:cursor-not-allowed disabled:bg-muted-bg data-[state=checked]:border-main data-[state=checked]:bg-main',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-3.5 rounded-xs bg-pencil transition-transform data-[state=checked]:translate-x-3.75 data-[state=checked]:bg-on-main"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };

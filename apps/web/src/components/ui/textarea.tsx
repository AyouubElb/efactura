import * as React from 'react';
import { cn } from '@/lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // 16 px on phones so the browser doesn't zoom into the field
        'field-sizing-content min-h-20 w-full min-w-0 rounded-md border-[1.5px] border-field bg-card px-3 py-2 text-base text-ink transition-[border-color,box-shadow] outline-none selection:bg-main-tint placeholder:text-pencil disabled:cursor-not-allowed disabled:bg-muted-bg disabled:text-pencil md:text-sm',
        'focus-visible:border-main focus-visible:ring-3 focus-visible:ring-main-tint',
        'aria-invalid:border-red aria-invalid:focus-visible:ring-red-tint',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };

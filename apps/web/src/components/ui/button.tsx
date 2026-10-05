import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Slot } from 'radix-ui';

const buttonVariants = cva(
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border-[1.5px] text-label font-semibold whitespace-nowrap transition-[transform,box-shadow,background-color] duration-100 outline-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-main disabled:cursor-not-allowed disabled:border-field disabled:bg-muted-bg disabled:text-pencil disabled:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-[15px]',
  {
    variants: {
      variant: {
        default:
          'border-ink bg-main text-on-main shadow-ink-2 hover:bg-main-hover active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
        secondary: 'border-ink bg-card text-ink hover:bg-paper',
        outline: 'border-ink bg-card text-ink hover:bg-paper',
        danger: 'border-red bg-card text-red hover:bg-red-tint',
        dangerFill:
          'border-ink bg-red text-on-main shadow-ink-2 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
        quiet:
          'border-transparent bg-transparent text-main-text underline decoration-[1.5px] underline-offset-3 hover:decoration-2',
        ghost: 'border-transparent bg-transparent text-ink hover:bg-main-tint',
      },
      size: {
        default: 'h-9 px-3',
        sm: 'h-8 px-2',
        icon: 'size-9',
        'icon-sm': 'size-8',
      },
    },
    compoundVariants: [{ variant: 'quiet', size: 'default', class: 'px-1' }],
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };

'use client';

import { CircleNotchIcon } from '@phosphor-icons/react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { Stamp } from '@/components/stamp';

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      position="bottom-right"
      duration={5000}
      icons={{
        success: <Stamp tone="done">Fait</Stamp>,
        info: <Stamp tone="way">Info</Stamp>,
        warning: <Stamp tone="check">À vérifier</Stamp>,
        error: <Stamp tone="act">Erreur</Stamp>,
        loading: <CircleNotchIcon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex w-full items-center gap-3 rounded-md border-[1.5px] border-ink bg-card px-3 py-2 font-sans text-sm text-ink shadow-ink-3',
          success: 'border-green',
          error: 'border-red',
          warning: 'border-amber',
          info: 'border-main-text',
          icon: 'h-auto! w-auto!',
          description: 'text-xs text-pencil',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };

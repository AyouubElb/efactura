import { Logo } from '@/components/logo';
import { cn } from '@/lib/utils';

export function PaperPage({ children }: { children: React.ReactNode }) {
  return (
    <main className="ruled grid min-h-dvh place-items-center py-10 pr-4 pl-gutter-phone md:pl-gutter">
      {children}
    </main>
  );
}

export function PaperCard({
  title,
  className,
  children,
}: {
  title?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        'grid w-full max-w-85 gap-4 rounded-md border-[1.5px] border-ink bg-card p-6 shadow-ink-3',
        className,
      )}
    >
      <Logo />
      {title && <h1 className="font-mono text-title text-ink">{title}</h1>}
      {children}
    </section>
  );
}

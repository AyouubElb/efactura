import type { Metadata } from 'next';
import Link from 'next/link';
import { PaperCard, PaperPage } from '@/components/paper-card';
import { buttonVariants } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Page introuvable' };

export default function NotFound() {
  return (
    <PaperPage>
      <PaperCard title="Cette page n'existe pas.">
        <p className="text-pencil">L&apos;adresse est peut-être incomplète.</p>
        <Link
          href="/dashboard"
          className={buttonVariants({ variant: 'secondary' })}
        >
          Retour au tableau de bord
        </Link>
      </PaperCard>
    </PaperPage>
  );
}

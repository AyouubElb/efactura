import Link from 'next/link';
import { PageHeader } from '@/components/page-header';

// The API refuses these calls anyway: this spares a Collaborateur a broken page
export function AdminOnly({ title }: { title: string }) {
  return (
    <div className="grid gap-6">
      <PageHeader crumb="Administration" title={title} />
      <section className="grid max-w-2xl justify-items-start gap-2 rounded-md border border-line bg-card p-6">
        <h2 className="font-mono text-subtitle">
          Cette page est réservée à l&apos;administrateur.
        </h2>
        <Link href="/dashboard" className="link text-label">
          Retour au tableau de bord
        </Link>
      </section>
    </div>
  );
}

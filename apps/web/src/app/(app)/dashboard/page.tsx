import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { getMe } from '@/features/auth/auth.queries';
import { monthInMorocco } from '@/lib/format';

export const metadata: Metadata = { title: 'Tableau de bord' };

export default async function DashboardPage() {
  const me = await getMe();
  const firstName = me.fullName.trim().split(/\s+/)[0];

  return (
    <div className="grid gap-6">
      <PageHeader crumb={monthInMorocco()} title={`Bonjour ${firstName}`} />
      <section className="max-w-2xl rounded-md border border-line bg-card p-6">
        <h2 className="font-mono text-subtitle">
          Le tableau de bord arrive avec les ventes.
        </h2>
      </section>
    </div>
  );
}

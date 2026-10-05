import { PageHeader } from '@/components/page-header';

export function ComingSoon({
  crumb,
  title,
}: {
  crumb?: string;
  title: string;
}) {
  return (
    <div className="grid gap-6">
      <PageHeader crumb={crumb} title={title} />
      <section className="max-w-2xl rounded-md border border-line bg-card p-6">
        <h2 className="font-mono text-subtitle">Cette page arrive bientôt.</h2>
      </section>
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="grid max-w-2xl justify-items-start gap-2 rounded-md border border-line bg-card p-6">
      <h2 className="font-mono text-subtitle">{title}</h2>
      {children && <p className="max-w-[46ch] text-pencil">{children}</p>}
      {action && <div className="pt-1">{action}</div>}
    </section>
  );
}

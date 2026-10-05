export function PageHeader({
  crumb,
  title,
  action,
}: {
  crumb?: React.ReactNode;
  title: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {crumb && <p className="mb-1 text-xs text-pencil">{crumb}</p>}
        <h1 className="font-mono text-title text-ink">{title}</h1>
      </div>
      {action}
    </header>
  );
}

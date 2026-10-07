export function PageHeader({
  crumb,
  title,
  stamp,
  action,
}: {
  crumb?: React.ReactNode;
  title: React.ReactNode;
  // A document's status, beside its number
  stamp?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {crumb && <p className="mb-1 text-xs text-pencil">{crumb}</p>}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="font-mono text-title text-ink">{title}</h1>
          {stamp}
        </div>
      </div>
      {action}
    </header>
  );
}

import { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold">{title}</h1>
        {description ? (
          <p className="text-sm text-muted-foreground/80">{description}</p>
        ) : null}
      </div>
      {actions}
    </div>
  );
}

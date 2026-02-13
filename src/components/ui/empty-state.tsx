import { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 border-border bg-card p-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted text-xl text-muted-foreground">{icon ?? "✨"}</div>
      <div className="text-base font-semibold">{title}</div>
      <p className="max-w-xs text-xs text-muted-foreground">{description}</p>
    </Card>
  );
}


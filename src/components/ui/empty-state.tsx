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
    <Card className="flex flex-col items-center justify-center gap-2 p-8 text-center">
      <div className="text-2xl text-muted-foreground">{icon ?? "✨"}</div>
      <div className="text-sm font-medium">{title}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </Card>
  );
}

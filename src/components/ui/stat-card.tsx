import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  title,
  value,
  icon,
  trend,
}: {
  title: string;
  value: string;
  icon: ReactNode;
  trend?: { value: string; positive?: boolean };
}) {
  return (
    <Card className="border-emerald-500/15 bg-gradient-to-br from-card via-card to-emerald-500/10">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{title}</p>
          <div className="rounded-full bg-primary/10 p-2 text-primary">{icon}</div>
        </div>
        <div className="flex items-end justify-between">
          <p className="text-2xl font-semibold">{value}</p>
          {trend ? (
            <span
              className={cn(
                "text-xs font-medium",
                trend.positive
                  ? "text-emerald-500 dark:text-emerald-400"
                  : "text-amber-500 dark:text-amber-400"
              )}
            >
              {trend.value}
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

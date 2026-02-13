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
    <Card className="relative overflow-hidden border-border bg-gradient-to-br from-white via-card to-primary/5">
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -right-10 top-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
        <div className="absolute left-6 bottom-6 h-16 w-16 rounded-full bg-emerald-400/15 blur-2xl" />
      </div>
      <CardContent className="relative space-y-5 p-6">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
          <div className="rounded-2xl border border-border bg-muted p-2 text-primary">
            {icon}
          </div>
        </div>
        <div className="flex items-end justify-between gap-3">
          <p className="text-3xl font-semibold">{value}</p>
          <div className="flex items-end gap-1">
            {[10, 16, 8, 20, 12].map((height, index) => (
              <span
                key={`${title}-bar-${index}`}
                className={cn(
                  "w-1.5 rounded-full bg-muted",
                  trend?.positive ? "bg-emerald-400/70" : "bg-amber-400/70"
                )}
                style={{ height }}
              />
            ))}
          </div>
        </div>
        {trend ? (
          <span
            className={cn(
              "text-xs font-medium",
              trend.positive ? "text-emerald-600" : "text-amber-600"
            )}
          >
            {trend.value}
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}

"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

export function Calendar({
  value,
  onSelect,
}: {
  value: Date;
  onSelect: (date: Date) => void;
}) {
  const goToMonth = (offset: number) => {
    const next = new Date(value.getFullYear(), value.getMonth() + offset, 1);
    onSelect(next);
  };

  const days = useMemo(() => {
    const start = new Date(value.getFullYear(), value.getMonth(), 1);
    const end = new Date(value.getFullYear(), value.getMonth() + 1, 0);
    const startWeekDay = start.getDay();
    const totalDays = end.getDate();
    const result: Array<Date | null> = [];

    for (let i = 0; i < startWeekDay; i += 1) {
      result.push(null);
    }
    for (let day = 1; day <= totalDays; day += 1) {
      result.push(new Date(value.getFullYear(), value.getMonth(), day));
    }
    return result;
  }, [value]);

  return (
    <div className="rounded-2xl border border-border/70 bg-card/95 p-4 shadow-[0_18px_36px_rgba(15,23,42,0.12)]">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          className="rounded-xl border border-input/90 bg-background/80 px-2.5 py-1.5 text-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/5 hover:text-primary hover:shadow-[0_8px_18px_rgba(37,99,235,0.16)]"
          onClick={() => goToMonth(-1)}
          aria-label="Mes anterior"
        >
          {"<"}
        </button>
        <span className="text-sm font-semibold capitalize tracking-tight">
          {value.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
        </span>
        <button
          type="button"
          className="rounded-xl border border-input/90 bg-background/80 px-2.5 py-1.5 text-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/5 hover:text-primary hover:shadow-[0_8px_18px_rgba(37,99,235,0.16)]"
          onClick={() => goToMonth(1)}
          aria-label="Proximo mes"
        >
          {">"}
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-xs text-muted-foreground">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((day, index) => (
          <div
            key={`${day}-${index}`}
            className="text-center text-[11px] font-medium uppercase tracking-[0.14em]"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1.5 text-sm">
        {days.map((date, idx) => {
          if (!date) {
            return <div key={`empty-${idx}`} />;
          }
          const isSelected = date.toDateString() === value.toDateString();
          return (
            <button
              key={date.toISOString()}
              className={cn(
                "h-10 rounded-xl border text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                isSelected
                  ? "border-primary/55 bg-primary/10 text-primary shadow-[0_8px_18px_rgba(37,99,235,0.2)]"
                  : "border-border/40 bg-background/70 hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/5 hover:text-primary hover:shadow-[0_8px_16px_rgba(37,99,235,0.14)]"
              )}
              onClick={() => onSelect(date)}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

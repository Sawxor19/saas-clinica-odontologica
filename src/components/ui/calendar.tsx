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
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-4 flex items-center justify-between text-sm font-medium">
        <button
          type="button"
          className="rounded-md border border-input px-2 py-1 text-xs hover:bg-accent"
          onClick={() => goToMonth(-1)}
          aria-label="Mês anterior"
        >
          ‹
        </button>
        <span>
          {value.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
        </span>
        <button
          type="button"
          className="rounded-md border border-input px-2 py-1 text-xs hover:bg-accent"
          onClick={() => goToMonth(1)}
          aria-label="Próximo mês"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-2 text-xs text-muted-foreground">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((day, index) => (
          <div key={`${day}-${index}`} className="text-center">
            {day}
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-2 text-sm">
        {days.map((date, idx) => {
          if (!date) {
            return <div key={`empty-${idx}`} />;
          }
          const isSelected =
            date.toDateString() === value.toDateString();
          return (
            <button
              key={date.toISOString()}
              className={cn(
                "h-10 rounded-md border text-sm",
                isSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-transparent hover:bg-muted"
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

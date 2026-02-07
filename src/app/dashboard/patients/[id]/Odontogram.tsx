"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { saveOdontogramAction } from "@/app/dashboard/patients/[id]/actions";

const TEETH = [
  18,17,16,15,14,13,12,11,
  21,22,23,24,25,26,27,28,
  48,47,46,45,44,43,42,41,
  31,32,33,34,35,36,37,38,
];

const STATUS = [
  { value: "healthy", label: "Saudável", color: "bg-emerald-100 text-emerald-700" },
  { value: "attention", label: "Atenção", color: "bg-amber-100 text-amber-700" },
  { value: "treated", label: "Tratado", color: "bg-sky-100 text-sky-700" },
  { value: "missing", label: "Ausente", color: "bg-slate-200 text-slate-600" },
];

export function Odontogram({
  patientId,
  initialData,
}: {
  patientId: string;
  initialData: Record<string, string>;
}) {
  const [data, setData] = useState<Record<string, string>>(initialData);

  const legend = useMemo(() => STATUS, []);

  const toggleStatus = (tooth: number) => {
    const current = data[String(tooth)] ?? "healthy";
    const index = STATUS.findIndex((item) => item.value === current);
    const next = STATUS[(index + 1) % STATUS.length].value;
    setData((prev) => ({ ...prev, [String(tooth)]: next }));
  };

  return (
    <form action={saveOdontogramAction} className="space-y-3">
      <input type="hidden" name="patient_id" value={patientId} />
      <input type="hidden" name="data" value={JSON.stringify(data)} />
      <div className="grid gap-2 md:grid-cols-8">
        {TEETH.map((tooth) => {
          const status = data[String(tooth)] ?? "healthy";
          const style = STATUS.find((item) => item.value === status)?.color ?? "bg-emerald-100 text-emerald-700";
          return (
            <button
              key={tooth}
              type="button"
              onClick={() => toggleStatus(tooth)}
              className={`rounded-md border px-2 py-2 text-xs ${style}`}
            >
              {tooth}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {legend.map((item) => (
          <span key={item.value} className={`rounded-md px-2 py-1 ${item.color}`}>
            {item.label}
          </span>
        ))}
      </div>
      <Button type="submit" size="sm">
        Salvar odontograma
      </Button>
    </form>
  );
}

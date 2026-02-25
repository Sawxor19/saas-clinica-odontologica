"use client";

import { useMemo, useState } from "react";
import { Plus, Receipt, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PatientOption = {
  id: string;
  full_name: string;
};

type ProcedureOption = {
  id: string;
  name: string;
  price: number;
};

type ItemRow = {
  procedure_id: string;
  quantity: string;
  unit_price: string;
};

function toNumber(value: string) {
  const normalized = value.replace(",", ".").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: number) {
  return Number(value || 0).toFixed(2).replace(".", ",");
}

export function BudgetForm({
  patients,
  procedures,
}: {
  patients: PatientOption[];
  procedures: ProcedureOption[];
}) {
  const [rows, setRows] = useState<ItemRow[]>([
    {
      procedure_id: "",
      quantity: "1",
      unit_price: "",
    },
  ]);
  const [discount, setDiscount] = useState("0");

  const procedureMap = useMemo(
    () => new Map(procedures.map((procedure) => [procedure.id, Number(procedure.price || 0)])),
    [procedures]
  );

  const preview = useMemo(() => {
    const subtotal = rows.reduce((sum, row) => {
      const quantity = Math.max(0, Math.floor(toNumber(row.quantity)));
      const unitPrice = Math.max(0, toNumber(row.unit_price));
      return sum + quantity * unitPrice;
    }, 0);
    const discountValue = Math.min(100, Math.max(0, toNumber(discount)));
    const discountAmount = subtotal * (discountValue / 100);
    const total = Math.max(0, subtotal - discountAmount);
    return { subtotal, discountAmount, total };
  }, [rows, discount]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-[2fr,1fr]">
        <select
          name="patient_id"
          className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 shadow-inner transition-colors focus:border-primary focus:bg-white focus:outline-none"
          required
        >
          <option value="">Paciente</option>
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.full_name}
            </option>
          ))}
        </select>
        <Input
          name="discount"
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={discount}
          onChange={(event) => setDiscount(event.target.value)}
          placeholder="Desconto (%)"
          className="border-slate-200 bg-slate-50 text-slate-700 shadow-inner transition-colors focus:border-primary focus:bg-white"
        />
      </div>

      <textarea
        name="notes"
        className="min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 shadow-inner placeholder:text-slate-400 transition-colors focus:border-primary focus:bg-white focus:outline-none"
        placeholder="Observacoes do orcamento"
      />

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
        <div className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700">
          <Receipt className="h-4 w-4 text-slate-500" />
          Itens
        </div>
        {rows.map((row, index) => (
          <div
            key={`budget-item-${index}`}
            className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-12"
          >
            <select
              name="procedure_id"
              value={row.procedure_id}
              onChange={(event) => {
                const procedureId = event.target.value;
                setRows((previous) => {
                  const next = [...previous];
                  const current = next[index];
                  if (!current) return previous;
                  const suggestedPrice = procedureMap.get(procedureId);
                  next[index] = {
                    ...current,
                    procedure_id: procedureId,
                    unit_price:
                      suggestedPrice !== undefined ? String(suggestedPrice) : current.unit_price,
                  };
                  return next;
                });
              }}
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 shadow-inner transition-colors focus:border-primary focus:bg-white focus:outline-none md:col-span-5"
              required
            >
              <option value="">Procedimento</option>
              {procedures.map((procedure) => (
                <option key={procedure.id} value={procedure.id}>
                  {procedure.name}
                </option>
              ))}
            </select>
            <Input
              name="quantity"
              type="number"
              min="1"
              value={row.quantity}
              onChange={(event) => {
                const value = event.target.value;
                setRows((previous) => {
                  const next = [...previous];
                  const current = next[index];
                  if (!current) return previous;
                  next[index] = { ...current, quantity: value };
                  return next;
                });
              }}
              className="border-slate-200 bg-slate-50 text-slate-700 shadow-inner transition-colors focus:border-primary focus:bg-white md:col-span-2"
              placeholder="Qtd"
              required
            />
            <Input
              name="unit_price"
              type="number"
              min="0"
              step="0.01"
              value={row.unit_price}
              onChange={(event) => {
                const value = event.target.value;
                setRows((previous) => {
                  const next = [...previous];
                  const current = next[index];
                  if (!current) return previous;
                  next[index] = { ...current, unit_price: value };
                  return next;
                });
              }}
              className="border-slate-200 bg-slate-50 text-slate-700 shadow-inner transition-colors focus:border-primary focus:bg-white md:col-span-3"
              placeholder="Valor unit."
              required
            />
            <div className="flex items-center justify-end text-xs font-medium text-slate-500 md:col-span-1">
              R$ {formatCurrency(Math.max(0, Math.floor(toNumber(row.quantity))) * Math.max(0, toNumber(row.unit_price)))}
            </div>
            <div className="md:col-span-1">
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50"
                disabled={rows.length === 1}
                onClick={() => {
                  setRows((previous) => {
                    if (previous.length === 1) return previous;
                    return previous.filter((_, rowIndex) => rowIndex !== index);
                  });
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-sky-50 px-4 py-3 md:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          className="justify-self-start rounded-xl border-slate-300 bg-white"
          onClick={() =>
            setRows((previous) => [
              ...previous,
              {
                procedure_id: "",
                quantity: "1",
                unit_price: "",
              },
            ])
          }
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Adicionar item
        </Button>

        <div className="grid gap-2 text-xs text-slate-500 sm:grid-cols-3 md:text-right">
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <div className="text-[11px] uppercase tracking-[0.08em] text-slate-400">Subtotal</div>
            <div className="text-sm font-semibold text-slate-900">R$ {formatCurrency(preview.subtotal)}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <div className="text-[11px] uppercase tracking-[0.08em] text-slate-400">Desconto</div>
            <div className="text-sm font-semibold text-slate-900">R$ {formatCurrency(preview.discountAmount)}</div>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2">
            <div className="text-[11px] uppercase tracking-[0.08em] text-blue-500">Total final</div>
            <div className="text-sm font-semibold text-blue-700">R$ {formatCurrency(preview.total)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

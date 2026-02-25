"use client";

import { useMemo, useState } from "react";
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
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <select
          name="patient_id"
          className="h-12 rounded-2xl border border-input bg-white px-4 text-sm text-foreground"
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
        />
      </div>

      <textarea
        name="notes"
        className="min-h-24 w-full rounded-2xl border border-input bg-white px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70"
        placeholder="Observacoes do orcamento"
      />

      <div className="space-y-3">
        <div className="text-sm font-medium">Itens</div>
        {rows.map((row, index) => (
          <div key={`budget-item-${index}`} className="grid gap-2 md:grid-cols-12">
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
              className="h-12 rounded-2xl border border-input bg-white px-4 text-sm text-foreground md:col-span-6"
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
              className="md:col-span-2"
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
              className="md:col-span-3"
              placeholder="Valor unit."
              required
            />
            <div className="md:col-span-1">
              <Button
                type="button"
                variant="outline"
                className="w-full text-destructive"
                onClick={() => {
                  setRows((previous) => {
                    if (previous.length === 1) return previous;
                    return previous.filter((_, rowIndex) => rowIndex !== index);
                  });
                }}
              >
                -
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background/95 px-4 py-3 text-sm">
        <Button
          type="button"
          variant="outline"
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
          + Adicionar item
        </Button>
        <div className="text-right text-xs text-muted-foreground">
          <div>Subtotal: R$ {preview.subtotal.toFixed(2)}</div>
          <div>Desconto: R$ {preview.discountAmount.toFixed(2)}</div>
          <div className="text-sm font-semibold text-foreground">Total: R$ {preview.total.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}

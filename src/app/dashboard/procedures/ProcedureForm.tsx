"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type MaterialOption = { id: string; name: string };

export function ProcedureForm({ materials }: { materials: MaterialOption[] }) {
  const [rows, setRows] = useState<Array<{ material_id: string; quantity: string }>>([
    { material_id: "", quantity: "" },
  ]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Input name="name" placeholder="Procedimento" required />
        <Input name="price" type="number" placeholder="Valor" required />
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Materiais utilizados</div>
        {rows.map((row, index) => (
          <div key={`material-${index}`} className="grid gap-3 md:grid-cols-3">
            <select
              name="material_id"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={row.material_id}
              onChange={(event) => {
                const next = [...rows];
                next[index] = { ...row, material_id: event.target.value };
                setRows(next);
              }}
            >
              <option value="">Selecione o material</option>
              {materials.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.name}
                </option>
              ))}
            </select>
            <Input
              name="quantity"
              type="number"
              placeholder="Quantidade"
              value={row.quantity}
              onChange={(event) => {
                const next = [...rows];
                next[index] = { ...row, quantity: event.target.value };
                setRows(next);
              }}
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRows((prev) => prev.filter((_, idx) => idx !== index));
                }}
                disabled={rows.length === 1}
              >
                Remover
              </Button>
              {index === rows.length - 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRows((prev) => [...prev, { material_id: "", quantity: "" }])}
                >
                  + Adicionar material
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

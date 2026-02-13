"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { updateProcedureAction, deleteProcedureAction } from "@/app/dashboard/procedures/actions";

type ProcedureRow = {
  id: string;
  name: string;
  price: number;
  materials?: Array<{ material_id: string; quantity: number }>;
};

type MaterialOption = { id: string; name: string };

export function ProceduresTable({
  procedures,
  materials,
}: {
  procedures: ProcedureRow[];
  materials: MaterialOption[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const formatPrice = (value: number) =>
    value.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="space-y-3">
      {procedures.map((procedure) => {
        const isOpen = openId === procedure.id;
        return (
          <div key={procedure.id} className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{procedure.name}</div>
                <div className="text-xs text-muted-foreground">
                  R$ {formatPrice(procedure.price)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setOpenId(isOpen ? null : procedure.id)}>
                  {isOpen ? "Fechar" : "Editar"}
                </Button>
                <form action={deleteProcedureAction}>
                  <input type="hidden" name="procedure_id" value={procedure.id} />
                  <Button size="sm" variant="outline" className="text-destructive" type="submit">
                    Remover
                  </Button>
                </form>
              </div>
            </div>

            {isOpen ? (
              <form className="mt-4 space-y-3" action={updateProcedureAction}>
                <input type="hidden" name="procedure_id" value={procedure.id} />
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    className="h-12 rounded-2xl border border-input bg-white px-4 text-sm text-foreground"
                    name="name"
                    defaultValue={procedure.name}
                  />
                  <input
                    className="h-12 rounded-2xl border border-input bg-white px-4 text-sm text-foreground"
                    name="price"
                    type="text"
                    inputMode="decimal"
                    defaultValue={formatPrice(procedure.price)}
                  />
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Materiais</div>
                  {(procedure.materials ?? [{ material_id: "", quantity: 0 }]).map((item, index) => (
                    <div key={`${procedure.id}-${index}`} className="grid gap-3 md:grid-cols-3">
                      <select
                        name="material_id"
                        defaultValue={item.material_id}
                        className="h-12 rounded-2xl border border-input bg-white px-4 text-sm text-foreground"
                      >
                        <option value="">Selecione</option>
                        {materials.map((material) => (
                          <option key={material.id} value={material.id}>
                            {material.name}
                          </option>
                        ))}
                      </select>
                      <input
                        name="quantity"
                        type="number"
                        defaultValue={item.quantity}
                        className="h-12 rounded-2xl border border-input bg-white px-4 text-sm text-foreground"
                      />
                      <div className="text-xs text-muted-foreground flex items-center">
                        Estoque vinculado
                      </div>
                    </div>
                  ))}
                </div>
                <Button type="submit">Salvar alterações</Button>
              </form>
            ) : null}
          </div>
        );
      })}
      {procedures.length === 0 ? (
        <div className="text-sm text-muted-foreground">Nenhum procedimento cadastrado.</div>
      ) : null}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { updateMaterialAction, deleteMaterialAction } from "@/app/dashboard/materials/actions";

type MaterialRow = {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  min_stock: number;
};

export function MaterialsTable({ materials }: { materials: MaterialRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {materials.map((material) => {
        const isOpen = openId === material.id;
        return (
          <div key={material.id} className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{material.name}</div>
                <div className="text-xs text-muted-foreground">
                  {material.current_stock} {material.unit} (mín. {material.min_stock})
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setOpenId(isOpen ? null : material.id)}>
                  {isOpen ? "Fechar" : "Editar"}
                </Button>
                <form action={deleteMaterialAction}>
                  <input type="hidden" name="material_id" value={material.id} />
                  <Button size="sm" variant="outline" className="text-destructive" type="submit">
                    Remover
                  </Button>
                </form>
              </div>
            </div>

            {isOpen ? (
              <form className="mt-4 grid gap-3 md:grid-cols-2" action={updateMaterialAction}>
                <input type="hidden" name="material_id" value={material.id} />
                <input
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  name="name"
                  defaultValue={material.name}
                />
                <input
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  name="unit"
                  defaultValue={material.unit}
                />
                <input
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  name="current_stock"
                  type="number"
                  defaultValue={material.current_stock}
                />
                <input
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  name="min_stock"
                  type="number"
                  defaultValue={material.min_stock}
                />
                <div className="md:col-span-2">
                  <Button type="submit">Salvar alterações</Button>
                </div>
              </form>
            ) : null}
          </div>
        );
      })}
      {materials.length === 0 ? (
        <div className="text-sm text-muted-foreground">Nenhum material cadastrado.</div>
      ) : null}
    </div>
  );
}

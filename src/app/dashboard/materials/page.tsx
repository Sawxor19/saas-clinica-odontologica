import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addMaterialAction } from "@/app/dashboard/materials/actions";
import { getInventoryInsights, getMaterials } from "@/server/services/materials";
import { MaterialsTable } from "@/app/dashboard/materials/MaterialsTable";

export default async function MaterialsPage() {
  const materials = await getMaterials();
  const insights = await getInventoryInsights();

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Materiais"
        description="Controle de estoque da clínica com níveis mínimos."
      />
      <Card>
        <CardHeader>
          <CardTitle>Novo material</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addMaterialAction} className="grid gap-3 md:grid-cols-2">
            <Input name="name" placeholder="Material" required />
            <Input name="unit" placeholder="Unidade (ex: un, ml)" />
            <Input name="current_stock" type="number" placeholder="Estoque atual" />
            <Input name="min_stock" type="number" placeholder="Estoque mínimo" />
            <div className="md:col-span-2">
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alertas e previsão</CardTitle>
        </CardHeader>
        <CardContent>
          {insights.lowStock.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhum material abaixo do mínimo.</div>
          ) : (
            <div className="space-y-2 text-sm">
              {insights.lowStock.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <span>{item.name}</span>
                  <span className="text-amber-600">
                    {item.current_stock} {item.unit} (mín. {item.min_stock})
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            {insights.forecast.slice(0, 6).map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <span>{item.name}</span>
                <span>
                  {item.daysLeft === null
                    ? "Sem consumo recente"
                    : `${Math.floor(item.daysLeft)} dia(s) de estoque`}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de materiais</CardTitle>
        </CardHeader>
        <CardContent>
          <MaterialsTable materials={materials} />
        </CardContent>
      </Card>
    </div>
  );
}

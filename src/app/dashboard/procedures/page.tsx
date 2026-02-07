import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { addProcedureAction } from "@/app/dashboard/procedures/actions";
import { getProcedures } from "@/server/services/procedures";
import { getMaterials } from "@/server/services/materials";
import { ProcedureForm } from "@/app/dashboard/procedures/ProcedureForm";
import { ProceduresTable } from "@/app/dashboard/procedures/ProceduresTable";

export default async function ProceduresPage() {
  const [procedures, materials] = await Promise.all([
    getProcedures(),
    getMaterials(),
  ]);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Procedimentos"
        description="Crie procedimentos e associe materiais e custos."
      />
      <Card>
        <CardHeader>
          <CardTitle>Novo procedimento</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addProcedureAction} className="space-y-4">
            <ProcedureForm materials={materials} />
            <div>
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de procedimentos</CardTitle>
        </CardHeader>
        <CardContent>
          <ProceduresTable procedures={procedures} materials={materials} />
        </CardContent>
      </Card>
    </div>
  );
}

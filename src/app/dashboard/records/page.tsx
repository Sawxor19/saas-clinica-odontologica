import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default function RecordsPage() {
  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Prontuário"
        description="Timeline clínica com evolução, prescrições e anexos."
      />
      <Card>
        <CardHeader>
          <CardTitle>Odontograma inteligente</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Selecione um paciente"
            description="Para visualizar o odontograma e a evolução clínica, escolha um paciente na lista."
          />
        </CardContent>
      </Card>
    </div>
  );
}

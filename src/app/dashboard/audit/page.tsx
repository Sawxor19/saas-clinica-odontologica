import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuditPage() {
  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Auditoria" />
      <Card>
        <CardHeader>
          <CardTitle>Logs de ações críticas</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Visualize alterações relevantes feitas por usuários.
        </CardContent>
      </Card>
    </div>
  );
}

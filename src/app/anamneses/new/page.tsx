import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createAnamnesisAction } from "@/app/anamneses/actions";

export default function NewAnamnesisPage() {
  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Nova anamnese"
        description="Crie um formulário em branco e monte os campos no editor."
      />

      <Card>
        <CardHeader>
          <CardTitle>Criar anamnese</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Comece com uma página vazia e escolha os blocos de perguntas no estilo construtor.
          </p>
          <form action={createAnamnesisAction} className="flex flex-col gap-3 md:flex-row">
            <Input
              name="title"
              placeholder="Nome da anamnese (ex: Pré-atendimento ortodontia)"
            />
            <Button type="submit">Criar anamnese</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

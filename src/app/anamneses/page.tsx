import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { anamnesisService } from "@/server/services/anamneses";
import { setAnamnesisStatusAction } from "@/app/anamneses/actions";
import { CopyPublicLinkButton } from "@/app/anamneses/CopyPublicLinkButton";

function formatStatus(status: string) {
  if (status === "published") return "Publicada";
  if (status === "archived") return "Arquivada";
  return "Rascunho";
}

function statusClassName(status: string) {
  if (status === "published") return "bg-emerald-100 text-emerald-700";
  if (status === "archived") return "bg-slate-100 text-slate-600";
  return "bg-amber-100 text-amber-700";
}

export default async function AnamnesesPage() {
  const forms = await anamnesisService.listFormsByClinic();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Anamnese"
        description="Crie e publique formulários personalizados para cada fluxo da clínica."
        actions={
          <Link href="/anamneses/new">
            <Button size="sm">Criar anamnese</Button>
          </Link>
        }
      />

      {forms.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <EmptyState
              title="Nenhuma anamnese criada"
              description="Comece criando o primeiro formulário personalizado da clínica."
            />
            <div className="mt-4">
              <Link href="/anamneses/new">
                <Button size="sm">Criar anamnese</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {forms.map((form) => {
            const publicUrl = `${appUrl}/p/anamnese/${form.public_slug}`;
            const archived = form.status === "archived";
            return (
              <Card key={form.id}>
                <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <CardTitle>{form.title}</CardTitle>
                    <div className="text-xs text-muted-foreground">
                      Atualizada em{" "}
                      {new Date(form.updated_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusClassName(form.status)}`}
                    >
                      {formatStatus(form.status)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <CopyPublicLinkButton url={publicUrl} />
                    <Link href={`/anamneses/${form.id}`}>
                      <Button size="sm" variant="outline">
                        Editar
                      </Button>
                    </Link>
                    <form action={setAnamnesisStatusAction}>
                      <input type="hidden" name="form_id" value={form.id} />
                      <input type="hidden" name="status" value={archived ? "draft" : "archived"} />
                      <Button type="submit" size="sm" variant="outline">
                        {archived ? "Reativar" : "Arquivar"}
                      </Button>
                    </form>
                  </div>
                </CardHeader>
                {form.description ? (
                  <CardContent className="pt-0 text-sm text-muted-foreground">
                    {form.description}
                  </CardContent>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

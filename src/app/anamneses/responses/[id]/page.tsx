import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { anamnesisService } from "@/server/services/anamneses";

function formatAnswer(answer: unknown) {
  if (answer === null || answer === undefined) return "-";
  if (typeof answer === "boolean") return answer ? "Sim" : "Nao";
  if (Array.isArray(answer)) {
    return answer.map((value) => String(value)).join(", ") || "-";
  }
  if (typeof answer === "object") {
    return JSON.stringify(answer);
  }
  return String(answer);
}

export default async function AnamnesisResponsePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const details = await anamnesisService.getResponseDetails(resolvedParams.id);
  if (!details) {
    notFound();
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={`Resposta: ${details.form.title}`}
        description="Leitura da anamnese enviada pelo paciente."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dados do envio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div>Paciente: {details.response.patient_name ?? "-"}</div>
            <div>Email: {details.response.patient_email ?? "-"}</div>
            <div>Status: {details.response.status === "signed" ? "Assinada" : "Enviada"}</div>
            <div>
              Enviada em:{" "}
              {new Date(details.response.submitted_at).toLocaleString("pt-BR")}
            </div>
            <div>
              Assinada em:{" "}
              {details.response.signed_at
                ? new Date(details.response.signed_at).toLocaleString("pt-BR")
                : "-"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assinatura digital</CardTitle>
          </CardHeader>
          <CardContent>
            {details.signature_signed_url ? (
              <img
                src={details.signature_signed_url}
                alt="Assinatura do paciente"
                className="h-44 w-full rounded-md border bg-white object-contain"
              />
            ) : (
              <div className="rounded-md border border-dashed p-8 text-sm text-muted-foreground">
                Assinatura nao disponivel.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Respostas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {details.fields.map((field) => (
            <div key={field.id} className="rounded-xl border p-3">
              <div className="text-sm font-medium">{field.label}</div>
              {field.help_text ? (
                <div className="text-xs text-muted-foreground">{field.help_text}</div>
              ) : null}
              <div className="mt-2 text-sm text-foreground">{formatAnswer(field.answer)}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

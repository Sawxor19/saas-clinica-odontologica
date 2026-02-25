import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createCaptcha } from "@/app/patient-intake/[token]/captcha";
import { submitAnamnesis } from "@/app/anamnese/[token]/actions";
import { AnamnesisPublicForm } from "@/app/anamnese/[token]/AnamnesisPublicForm";
import { getPublicAnamnesisByToken } from "@/server/services/anamnesis";

export const dynamic = "force-dynamic";

type Question = {
  id: string;
  label: string;
  type: "text" | "textarea" | "number" | "date" | "boolean" | "single_choice" | "multiple_choice";
  required?: boolean;
  placeholder?: string;
  options?: string[];
};

export default async function AnamnesisPublicPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const link = await getPublicAnamnesisByToken(token);

  if (!link) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>Link invalido</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Este link de anamnese esta expirado, ja foi utilizado ou nao existe.
          </CardContent>
        </Card>
      </div>
    );
  }

  const captcha = createCaptcha();
  const template = link.template as {
    title?: string | null;
    description?: string | null;
    questions?: Question[];
  };
  const patient = (link.patient as { full_name?: string | null } | null) ?? null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-8">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>{template.title || "Anamnese"}</CardTitle>
          {template.description ? (
            <p className="text-sm text-muted-foreground">{template.description}</p>
          ) : null}
          {error ? (
            <p className="text-sm text-destructive">{decodeURIComponent(error)}</p>
          ) : null}
        </CardHeader>
        <CardContent>
          <AnamnesisPublicForm
            action={submitAnamnesis.bind(null, token)}
            captcha={captcha}
            template={{
              title: String(template.title ?? "Anamnese"),
              description: template.description ?? null,
              questions: Array.isArray(template.questions) ? template.questions : [],
            }}
            patientNameHint={patient?.full_name ?? null}
          />
        </CardContent>
      </Card>
    </div>
  );
}

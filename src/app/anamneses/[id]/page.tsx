import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { FormBuilder } from "@/components/anamneses/FormBuilder";
import { anamnesisService } from "@/server/services/anamneses";
import { saveAnamnesisBuilderAction } from "@/app/anamneses/[id]/actions";

export default async function AnamnesisEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const form = await anamnesisService.getForm(resolvedParams.id);
  if (!form) {
    notFound();
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const publicUrl = `${appUrl}/p/anamnese/${form.public_slug}`;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={form.title}
        description="Construa perguntas, publique e compartilhe o link com o paciente."
      />
      <FormBuilder
        initialForm={form}
        publicUrl={publicUrl}
        saveAction={saveAnamnesisBuilderAction.bind(null, form.id)}
      />
    </div>
  );
}

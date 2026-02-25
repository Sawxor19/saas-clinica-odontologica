import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PublicFormRenderer } from "@/components/anamneses/PublicFormRenderer";
import { anamnesisService } from "@/server/services/anamneses";
import { submitPublicAnamnesisAction } from "@/app/p/anamnese/[slug]/actions";

export const dynamic = "force-dynamic";

export default async function PublicAnamnesisPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ success?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const form = await anamnesisService.getFormByPublicSlug(resolvedParams.slug);
  if (!form) {
    notFound();
  }

  const success = resolvedSearchParams.success === "1";

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-8">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Anamnese digital</CardTitle>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4 py-8 text-center">
              <h2 className="text-2xl font-semibold">Anamnese enviada com sucesso!</h2>
              <p className="text-sm text-muted-foreground">
                Obrigado. A clinica ja recebeu seus dados, assinatura digital e data de envio.
              </p>
              <Link href="/">
                <Button variant="outline">Finalizar</Button>
              </Link>
            </div>
          ) : (
            <PublicFormRenderer
              title={form.title}
              description={form.description}
              fields={form.fields}
              action={submitPublicAnamnesisAction.bind(null, resolvedParams.slug)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

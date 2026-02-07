import { requestPasswordResetAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<{ sent?: string; error?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const sent = resolvedSearchParams?.sent === "1";
  const errorMessage = resolvedSearchParams?.error;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Recuperar senha</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sent ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              Enviamos um email com instruções para redefinir sua senha.
            </div>
          ) : null}
          {errorMessage ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
              {errorMessage}
            </div>
          ) : null}
          <form className="space-y-4" action={requestPasswordResetAction}>
            <Input name="email" type="email" placeholder="Email" required />
            <Button className="w-full" type="submit">
              Enviar link de recuperação
            </Button>
          </form>
          <div className="text-center">
            <a className="text-sm text-muted-foreground hover:text-foreground" href="/login">
              Voltar para o login
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

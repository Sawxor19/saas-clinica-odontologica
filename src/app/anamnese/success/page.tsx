import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AnamnesisSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Anamnese enviada com sucesso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Recebemos suas respostas e assinatura digital. A clinica ja pode continuar o atendimento.
          </p>
          <Link href="/">
            <Button variant="outline">Voltar</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

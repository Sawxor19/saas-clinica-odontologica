import Link from "next/link";

export default function BillingBlockedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-lg text-center">
        <h1 className="text-2xl font-semibold">Assinatura inativa</h1>
        <p className="mt-2 text-muted-foreground">
          Sua clínica está com a assinatura expirada ou cancelada. Fale com o
          administrador ou regularize o pagamento.
        </p>
        <div className="mt-6">
          <Link className="inline-flex rounded-md border border-input px-4 py-2 text-sm" href="/billing">
            Ir para assinatura
          </Link>
        </div>
      </div>
    </div>
  );
}

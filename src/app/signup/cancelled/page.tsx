import Link from "next/link";

export default function SignupCancelledPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Pagamento cancelado</h1>
        <p className="mt-2 text-muted-foreground">
          Você pode tentar novamente quando quiser.
        </p>
        <Link className="mt-6 inline-flex rounded-md border border-input px-4 py-2 text-sm" href="/signup">
          Voltar ao cadastro
        </Link>
      </div>
    </div>
  );
}

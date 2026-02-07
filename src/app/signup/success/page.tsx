import Link from "next/link";

export default function SignupSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Pagamento confirmado</h1>
        <p className="mt-2 text-muted-foreground">
          Sua assinatura está ativa. Faça login para acessar o sistema.
        </p>
        <Link className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground" href="/login">
          Ir para login
        </Link>
      </div>
    </div>
  );
}

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Acesso negado</h1>
        <p className="mt-2 text-muted-foreground">
          Você não tem permissão para acessar esta área.
        </p>
      </div>
    </div>
  );
}

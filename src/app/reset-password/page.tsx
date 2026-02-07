import { Suspense } from "react";
import ResetPasswordClient from "./ResetPasswordClient";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
          <div className="text-sm text-muted-foreground">Carregando...</div>
        </div>
      }
    >
      <ResetPasswordClient />
    </Suspense>
  );
}

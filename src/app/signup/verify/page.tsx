import { Suspense } from "react";
import SignupVerifyClient from "./SignupVerifyClient";

export default function SignupVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
          <div className="text-sm text-muted-foreground">Carregando...</div>
        </div>
      }
    >
      <SignupVerifyClient />
    </Suspense>
  );
}

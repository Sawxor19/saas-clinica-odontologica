import { Suspense } from "react";
import SignupSuccessClient from "./SignupSuccessClient";

export default function SignupSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Ativando conta...
        </div>
      }
    >
      <SignupSuccessClient />
    </Suspense>
  );
}

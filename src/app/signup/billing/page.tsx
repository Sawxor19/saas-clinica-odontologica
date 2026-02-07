import { Suspense } from "react";
import SignupBillingClient from "./SignupBillingClient";

export default function SignupBillingPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-muted-foreground">Carregando...</div>
      }
    >
      <SignupBillingClient />
    </Suspense>
  );
}

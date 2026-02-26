import { Suspense } from "react";
import SignupBillingClient from "./SignupBillingClient";

export default function SignupBillingPage() {
  return (
    <Suspense fallback={null}>
      <SignupBillingClient />
    </Suspense>
  );
}

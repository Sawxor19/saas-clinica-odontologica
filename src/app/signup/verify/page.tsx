import { Suspense } from "react";
import SignupVerifyClient from "./SignupVerifyClient";

export default function SignupVerifyPage() {
  return (
    <Suspense fallback={null}>
      <SignupVerifyClient />
    </Suspense>
  );
}

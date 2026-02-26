import { Suspense } from "react";
import SignupSuccessClient from "./SignupSuccessClient";

export default function SignupSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SignupSuccessClient />
    </Suspense>
  );
}

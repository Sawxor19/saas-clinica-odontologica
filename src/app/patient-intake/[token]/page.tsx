import { submitPatientIntake } from "@/app/patient-intake/[token]/actions";
import { createCaptcha } from "@/app/patient-intake/[token]/captcha";
import { PatientIntakeForm } from "@/app/patient-intake/[token]/PatientIntakeForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function PatientIntakePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = await params;
  const captcha = createCaptcha();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Cadastro do paciente</CardTitle>
        </CardHeader>
        <CardContent>
          <PatientIntakeForm
            action={submitPatientIntake.bind(null, resolvedParams.token)}
            captcha={captcha}
          />
        </CardContent>
      </Card>
    </div>
  );
}

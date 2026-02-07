import { submitPatientIntake } from "@/app/patient-intake/[token]/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function PatientIntakePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = await params;
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Cadastro do paciente</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 md:grid-cols-2"
            action={submitPatientIntake.bind(null, resolvedParams.token)}
          >
            <Input name="full_name" placeholder="Nome completo" required />
            <Input name="email" type="email" placeholder="Email" />
            <Input name="birth_date" type="date" placeholder="Nascimento" />
            <Input name="cpf" placeholder="CPF" />
            <Input name="address" placeholder="Endereço" />
            <Input name="cep" placeholder="CEP" />
            <Input name="emergency_contact" placeholder="Contato de emergência" />
            <Input name="allergies" placeholder="Alergias" />
            <Input name="chronic_conditions" placeholder="Doenças crônicas" />
            <Input name="medications" placeholder="Medicamentos em uso" />
            <Input name="alerts" placeholder="Alertas clínicos" />
            <Input name="notes" placeholder="Observações" />
            <div className="md:col-span-2">
              <Button type="submit" className="w-full">
                Finalizar cadastro
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

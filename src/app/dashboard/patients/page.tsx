import { PatientForm } from "@/app/dashboard/patients/PatientForm";
import { IntakeLinkForm } from "@/app/dashboard/patients/IntakeLinkForm";
import { AnamnesisBuilder } from "@/app/dashboard/patients/AnamnesisBuilder";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PatientsTable } from "@/app/dashboard/patients/PatientsTable";
import { getPatients } from "@/server/services/patients";
import { getClinicContext } from "@/server/auth/context";
import { listDentists } from "@/server/repositories/profiles";
import { getAnamnesisTemplates } from "@/server/services/anamnesis";

export default async function PatientsPage() {
  const patients = await getPatients();
  const { clinicId } = await getClinicContext();
  const dentists = await listDentists(clinicId);
  const anamnesisTemplates = await getAnamnesisTemplates();

  const patientOptions = patients.map((patient) => ({
    id: patient.id as string,
    full_name: String(patient.full_name ?? "Paciente"),
  }));
  const templateOptions = anamnesisTemplates.map((template) => ({
    id: template.id as string,
    title: String(template.title ?? "Anamnese"),
  }));

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Pacientes"
        description="Cadastre e acompanhe pacientes com histórico completo."
      />
      <Card>
        <CardHeader>
          <CardTitle>Cadastro rápido por WhatsApp</CardTitle>
        </CardHeader>
        <CardContent>
          <IntakeLinkForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Criar anamnese</CardTitle>
        </CardHeader>
        <CardContent>
          <AnamnesisBuilder templates={templateOptions} patients={patientOptions} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Novo paciente</CardTitle>
        </CardHeader>
        <CardContent>
          <PatientForm dentists={dentists} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de pacientes</CardTitle>
        </CardHeader>
        <CardContent>
          <PatientsTable data={patients} dentists={dentists} />
        </CardContent>
      </Card>
    </div>
  );
}

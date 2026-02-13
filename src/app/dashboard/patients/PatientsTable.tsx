"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/layout/DataTable";
import { Button } from "@/components/ui/button";
import { FloatingLabelInput, FloatingLabelTextarea } from "@/components/ui/floating-field";
import { updatePatientAction, deletePatientAction } from "@/app/dashboard/patients/actions";

type PatientRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  notes: string | null;
  cpf: string | null;
  address: string | null;
  cep: string | null;
  emergency_contact: string | null;
  allergies: string | null;
  chronic_conditions: string | null;
  medications: string | null;
  alerts: string | null;
  status: string | null;
  dentist_id: string | null;
};

type DentistOption = { user_id: string; full_name: string };

export function PatientsTable({
  data,
  dentists,
}: {
  data: PatientRow[];
  dentists: DentistOption[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const selected = useMemo(() => data.find((item) => item.id === openId) ?? null, [data, openId]);

  return (
    <>
      <DataTable
        columns={[
          {
            key: "full_name",
            label: "Nome",
            render: (row) => (
              <Link className="text-primary" href={`/dashboard/patients/${row.id}`}>
                {row.full_name}
              </Link>
            ),
          },
          { key: "email", label: "Email" },
          { key: "phone", label: "Telefone" },
          {
            key: "id",
            label: "Ações",
            render: (row) => (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpenId(row.id)}
                >
                  Editar
                </Button>
                <Link href={`/dashboard/patients/${row.id}`}>
                  <Button variant="outline" size="sm">
                    Abrir ficha
                  </Button>
                </Link>
                <form action={deletePatientAction}>
                  <input type="hidden" name="patient_id" value={row.id} />
                  <Button variant="outline" size="sm" className="text-destructive" type="submit">
                    Remover
                  </Button>
                </form>
              </div>
            ),
          },
        ]}
        data={data}
        searchPlaceholder="Buscar pacientes"
        searchKeys={["full_name", "email", "phone"]}
      />

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="glass-panel fade-up w-full max-w-3xl rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Editar paciente</h2>
                <p className="text-xs text-muted-foreground">Atualize os dados principais do paciente.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setOpenId(null)}>
                Fechar
              </Button>
            </div>

            <form className="mt-4 grid gap-3 md:grid-cols-2" action={updatePatientAction}>
              <input type="hidden" name="patient_id" value={selected.id} />
              <FloatingLabelInput
                name="full_name"
                label="Nome completo"
                defaultValue={selected.full_name}
                />
              <FloatingLabelInput
                name="email"
                label="Email"
                defaultValue={selected.email ?? ""}
                />
              <FloatingLabelInput
                name="phone"
                label="Telefone"
                defaultValue={selected.phone ?? ""}
                />
              <FloatingLabelInput
                name="birth_date"
                label="Nascimento"
                type="date"
                defaultValue={selected.birth_date ?? ""}
              />
              <FloatingLabelInput
                name="cpf"
                label="CPF"
                defaultValue={selected.cpf ?? ""}
                />
              <FloatingLabelInput
                name="cep"
                label="CEP"
                defaultValue={selected.cep ?? ""}
                />
              <FloatingLabelInput
                name="address"
                label="Endereco"
                defaultValue={selected.address ?? ""}
              />
              <FloatingLabelInput
                name="emergency_contact"
                label="Contato de emergencia"
                defaultValue={selected.emergency_contact ?? ""}
              />
              <FloatingLabelInput
                name="allergies"
                label="Alergias"
                defaultValue={selected.allergies ?? ""}
                />
              <FloatingLabelInput
                name="chronic_conditions"
                label="Condicoes cronicas"
                defaultValue={selected.chronic_conditions ?? ""}
              />
              <FloatingLabelInput
                name="medications"
                label="Medicacoes"
                defaultValue={selected.medications ?? ""}
              />
              <FloatingLabelInput
                name="alerts"
                label="Alertas"
                defaultValue={selected.alerts ?? ""}
                />
              <select
                name="dentist_id"
                className="h-12 rounded-2xl border border-input bg-white px-4 text-sm text-foreground"
                defaultValue={selected.dentist_id ?? ""}
              >
                <option value="">Dentista responsável</option>
                {dentists.map((dentist) => (
                  <option key={dentist.user_id} value={dentist.user_id}>
                    {dentist.full_name}
                  </option>
                ))}
              </select>
              <select
                name="status"
                className="h-12 rounded-2xl border border-input bg-white px-4 text-sm text-foreground"
                defaultValue={selected.status ?? "active"}
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
                <option value="intake_pending">Cadastro pendente</option>
              </select>
              <div className="md:col-span-2">
                <FloatingLabelTextarea
                  name="notes"
                  label="Observacoes"
                  defaultValue={selected.notes ?? ""}
                />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button type="submit">Salvar alterações</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

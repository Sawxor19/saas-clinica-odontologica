"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/layout/DataTable";
import { Button } from "@/components/ui/button";
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-xl bg-background p-6 shadow-xl">
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
              <input
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                name="full_name"
                defaultValue={selected.full_name}
                placeholder="Nome completo"
              />
              <input
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                name="email"
                defaultValue={selected.email ?? ""}
                placeholder="Email"
              />
              <input
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                name="phone"
                defaultValue={selected.phone ?? ""}
                placeholder="Telefone"
              />
              <input
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                name="birth_date"
                type="date"
                defaultValue={selected.birth_date ?? ""}
              />
              <input
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                name="cpf"
                defaultValue={selected.cpf ?? ""}
                placeholder="CPF"
              />
              <input
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                name="cep"
                defaultValue={selected.cep ?? ""}
                placeholder="CEP"
              />
              <input
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                name="address"
                defaultValue={selected.address ?? ""}
                placeholder="Endereço"
              />
              <input
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                name="emergency_contact"
                defaultValue={selected.emergency_contact ?? ""}
                placeholder="Contato de emergência"
              />
              <input
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                name="allergies"
                defaultValue={selected.allergies ?? ""}
                placeholder="Alergias"
              />
              <input
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                name="chronic_conditions"
                defaultValue={selected.chronic_conditions ?? ""}
                placeholder="Condições crônicas"
              />
              <input
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                name="medications"
                defaultValue={selected.medications ?? ""}
                placeholder="Medicações"
              />
              <input
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                name="alerts"
                defaultValue={selected.alerts ?? ""}
                placeholder="Alertas"
              />
              <select
                name="dentist_id"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
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
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                defaultValue={selected.status ?? "active"}
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
                <option value="intake_pending">Cadastro pendente</option>
              </select>
              <textarea
                className="min-h-[96px] rounded-md border border-input bg-background px-3 py-2 text-sm md:col-span-2"
                name="notes"
                defaultValue={selected.notes ?? ""}
                placeholder="Observações"
              />
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

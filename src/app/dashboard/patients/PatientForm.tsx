"use client";

import { useState, useTransition } from "react";
import { addPatientAction } from "@/app/dashboard/patients/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toast } from "@/components/ui/toast";

type DentistOption = { user_id: string; full_name: string };

function maskCPF(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})$/, "$1.$2.$3-$4");
}

function maskCEP(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/(\d{5})(\d)/, "$1-$2");
}

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

export function PatientForm({ dentists }: { dentists: DentistOption[] }) {
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(
    null
  );
  const [cpf, setCpf] = useState("");
  const [cep, setCep] = useState("");
  const [phone, setPhone] = useState("");

  return (
    <>
      {toast ? (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      ) : null}
      <form
        className="grid gap-3 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          startTransition(async () => {
            try {
              await addPatientAction(formData);
              setToast({ message: "Paciente cadastrado com sucesso", variant: "success" });
              event.currentTarget.reset();
              setCpf("");
              setCep("");
              setPhone("");
            } catch {
              setToast({ message: "Falha ao cadastrar paciente", variant: "error" });
            }
          });
        }}
      >
        <Input name="full_name" placeholder="Nome completo" required />
        <Input name="email" type="email" placeholder="Email" />
        <Input
          name="phone"
          placeholder="Telefone"
          value={phone}
          onChange={(event) => setPhone(maskPhone(event.target.value))}
        />
        <Input name="birth_date" type="date" placeholder="Nascimento" />
        <Input
          name="cpf"
          placeholder="CPF"
          value={cpf}
          onChange={(event) => setCpf(maskCPF(event.target.value))}
        />
        <Input name="address" placeholder="Endereço" />
        <Input
          name="cep"
          placeholder="CEP"
          value={cep}
          onChange={(event) => setCep(maskCEP(event.target.value))}
        />
        <Input name="emergency_contact" placeholder="Contato de emergência" />
        <Input name="allergies" placeholder="Alergias" />
        <Input name="chronic_conditions" placeholder="Doenças crônicas" />
        <Input name="medications" placeholder="Medicamentos em uso" />
        <Input name="alerts" placeholder="Alertas clínicos" />
        <div className="grid gap-2 md:col-span-2">
          <label className="text-sm font-medium">Dentista responsável</label>
          <select
            name="dentist_id"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Não definido</option>
            {dentists.map((dentist) => (
              <option key={dentist.user_id} value={dentist.user_id}>
                {dentist.full_name}
              </option>
            ))}
          </select>
        </div>
        <Input name="notes" placeholder="Observações" />
        <div className="md:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </>
  );
}

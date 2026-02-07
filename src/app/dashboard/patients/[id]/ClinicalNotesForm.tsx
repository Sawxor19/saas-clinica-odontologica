"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { addClinicalNoteAction } from "@/app/dashboard/patients/[id]/actions";

const templates = [
  {
    label: "Avaliação inicial",
    value: "Anamnese realizada. Queixa principal: ...\nPlano inicial: ...",
  },
  {
    label: "Retorno",
    value: "Paciente retornou para acompanhamento. Evolução: ...\nConduta: ...",
  },
  {
    label: "Procedimento",
    value: "Procedimento realizado: ...\nMaterial utilizado: ...\nObservações: ...",
  },
];

export function ClinicalNotesForm({ patientId }: { patientId: string }) {
  const [note, setNote] = useState("");

  return (
    <form action={addClinicalNoteAction} className="space-y-2">
      <input type="hidden" name="patient_id" value={patientId} />
      <select
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        value=""
        onChange={(event) => {
          const selected = templates.find((item) => item.label === event.target.value);
          if (selected) setNote(selected.value);
        }}
      >
        <option value="">Template de evolução</option>
        {templates.map((item) => (
          <option key={item.label} value={item.label}>
            {item.label}
          </option>
        ))}
      </select>
      <textarea
        name="note"
        className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        placeholder="Adicionar evolução clínica..."
        value={note}
        onChange={(event) => setNote(event.target.value)}
        required
      />
      <Button type="submit" size="sm">
        Salvar evolução
      </Button>
    </form>
  );
}

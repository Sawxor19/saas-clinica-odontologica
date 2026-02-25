"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TextareaHTMLAttributes } from "react";

const DEFAULT_TEMPLATES: Record<string, { title: string; content: string }> = {
  prescription: {
    title: "Receita odontologica",
    content:
      "Uso de medicacao:\n- Medicamento: \n- Posologia: \n- Duracao: \n\nOrientacoes adicionais:\n- ",
  },
  certificate: {
    title: "Atestado odontologico",
    content:
      "Atesto para os devidos fins que o(a) paciente foi atendido(a) nesta clinica em __/__/____, necessitando de afastamento por ____ dia(s).",
  },
  clinical_document: {
    title: "Documento clinico",
    content:
      "Descricao do documento clinico.\n\nConduta realizada:\n- \n\nRecomendacoes:\n- ",
  },
};

export function ClinicalDocumentsForm({
  patientId,
  action,
}: {
  patientId: string;
  action: (formData: FormData) => void;
}) {
  const [documentType, setDocumentType] = useState("prescription");
  const [title, setTitle] = useState(DEFAULT_TEMPLATES.prescription.title);
  const [content, setContent] = useState(DEFAULT_TEMPLATES.prescription.content);

  const textareaProps: TextareaHTMLAttributes<HTMLTextAreaElement> = {
    name: "content",
    value: content,
    onChange: (event) => setContent(event.target.value),
    className:
      "min-h-36 w-full rounded-2xl border border-input bg-white px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70",
    required: true,
  };

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="patient_id" value={patientId} />
      <div className="grid gap-3 md:grid-cols-2">
        <select
          name="document_type"
          value={documentType}
          onChange={(event) => {
            const nextType = event.target.value;
            setDocumentType(nextType);
            setTitle(DEFAULT_TEMPLATES[nextType]?.title ?? "");
            setContent(DEFAULT_TEMPLATES[nextType]?.content ?? "");
          }}
          className="h-12 rounded-2xl border border-input bg-white px-4 text-sm text-foreground"
        >
          <option value="prescription">Receita</option>
          <option value="certificate">Atestado</option>
          <option value="clinical_document">Documento clinico</option>
        </select>
        <Input
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Titulo do documento"
          required
        />
      </div>
      <textarea {...textareaProps} />
      <div className="flex justify-end">
        <Button type="submit" size="sm">
          Emitir PDF e anexar na ficha
        </Button>
      </div>
    </form>
  );
}

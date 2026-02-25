"use client";

import { FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SignaturePad } from "@/components/anamneses/SignaturePad";

type FieldType =
  | "text"
  | "textarea"
  | "select"
  | "radio"
  | "checkbox"
  | "date"
  | "yes_no"
  | "number";

type PublicField = {
  id: string;
  label: string;
  help_text: string | null;
  type: FieldType;
  required: boolean;
  options: string[] | null;
};

export function PublicFormRenderer({
  title,
  description,
  fields,
  action,
}: {
  title: string;
  description: string | null;
  fields: PublicField[];
  action: (formData: FormData) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [signatureData, setSignatureData] = useState("");
  const [signatureError, setSignatureError] = useState<string | null>(null);

  const answersJson = useMemo(() => JSON.stringify(answers), [answers]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (!signatureData) {
      event.preventDefault();
      setSignatureError("Assinatura obrigatoria.");
    }
  };

  return (
    <form action={action} onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="answers_json" value={answersJson} />

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Input
          name="patient_name"
          placeholder="Nome completo do paciente"
          required
        />
        <Input name="patient_email" type="email" placeholder="Email do paciente (opcional)" />
      </div>

      <div className="rounded-xl border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
        Seus dados estarao protegidos pela LGPD e serao utilizados somente para fins clinicos.
      </div>

      {fields.map((field) => (
        <div key={field.id} className="space-y-2 rounded-xl border p-4">
          <label className="text-sm font-medium text-foreground">
            {field.label}
            {field.required ? " *" : ""}
          </label>
          {field.help_text ? (
            <p className="text-xs text-muted-foreground">{field.help_text}</p>
          ) : null}

          {field.type === "text" ? (
            <Input
              required={field.required}
              value={typeof answers[field.id] === "string" ? String(answers[field.id]) : ""}
              onChange={(event) =>
                setAnswers((prev) => ({ ...prev, [field.id]: event.target.value }))
              }
            />
          ) : null}

          {field.type === "number" ? (
            <Input
              type="number"
              required={field.required}
              value={typeof answers[field.id] === "string" ? String(answers[field.id]) : ""}
              onChange={(event) =>
                setAnswers((prev) => ({ ...prev, [field.id]: event.target.value }))
              }
            />
          ) : null}

          {field.type === "date" ? (
            <Input
              type="date"
              required={field.required}
              value={typeof answers[field.id] === "string" ? String(answers[field.id]) : ""}
              onChange={(event) =>
                setAnswers((prev) => ({ ...prev, [field.id]: event.target.value }))
              }
            />
          ) : null}

          {field.type === "textarea" ? (
            <textarea
              required={field.required}
              value={typeof answers[field.id] === "string" ? String(answers[field.id]) : ""}
              onChange={(event) =>
                setAnswers((prev) => ({ ...prev, [field.id]: event.target.value }))
              }
              className="w-full rounded-2xl border border-input bg-white px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              rows={4}
            />
          ) : null}

          {field.type === "select" ? (
            <select
              required={field.required}
              value={typeof answers[field.id] === "string" ? String(answers[field.id]) : ""}
              onChange={(event) =>
                setAnswers((prev) => ({ ...prev, [field.id]: event.target.value }))
              }
              className="h-11 w-full rounded-2xl border border-input bg-white px-4 text-sm text-foreground"
            >
              <option value="">Selecione</option>
              {(field.options ?? []).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : null}

          {field.type === "radio" ? (
            <div className="space-y-2">
              {(field.options ?? []).map((option) => (
                <label key={option} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={`radio-${field.id}`}
                    required={field.required}
                    checked={answers[field.id] === option}
                    onChange={() => setAnswers((prev) => ({ ...prev, [field.id]: option }))}
                  />
                  {option}
                </label>
              ))}
            </div>
          ) : null}

          {field.type === "checkbox" ? (
            <div className="space-y-2">
              {(field.options ?? []).map((option) => {
                const current = Array.isArray(answers[field.id])
                  ? (answers[field.id] as string[])
                  : [];
                const checked = current.includes(option);
                return (
                  <label key={option} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        setAnswers((prev) => {
                          const values = Array.isArray(prev[field.id])
                            ? [...(prev[field.id] as string[])]
                            : [];
                          if (event.target.checked) {
                            if (!values.includes(option)) values.push(option);
                          } else {
                            const index = values.indexOf(option);
                            if (index >= 0) values.splice(index, 1);
                          }
                          return {
                            ...prev,
                            [field.id]: values,
                          };
                        })
                      }
                    />
                    {option}
                  </label>
                );
              })}
            </div>
          ) : null}

          {field.type === "yes_no" ? (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={`yesno-${field.id}`}
                  required={field.required}
                  checked={answers[field.id] === "sim"}
                  onChange={() => setAnswers((prev) => ({ ...prev, [field.id]: "sim" }))}
                />
                Sim
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={`yesno-${field.id}`}
                  required={field.required}
                  checked={answers[field.id] === "nao"}
                  onChange={() => setAnswers((prev) => ({ ...prev, [field.id]: "nao" }))}
                />
                Nao
              </label>
            </div>
          ) : null}
        </div>
      ))}

      <div className="space-y-2 rounded-xl border p-4">
        <label className="text-sm font-medium">Assinatura digital</label>
        <SignaturePad
          value={signatureData}
          onChange={(value) => {
            setSignatureData(value);
            if (value) setSignatureError(null);
          }}
          error={signatureError}
        />
      </div>

      <Button type="submit" className="w-full">
        Enviar anamnese
      </Button>
    </form>
  );
}

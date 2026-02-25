"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toast } from "@/components/ui/toast";
import {
  createAnamnesisTemplateAction,
  generateAnamnesisLinkAction,
} from "@/app/dashboard/patients/anamnesis-actions";

type QuestionType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "boolean"
  | "single_choice"
  | "multiple_choice";

type QuestionDraft = {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  placeholder: string;
  optionsText: string;
};

type TemplateOption = {
  id: string;
  title: string;
};

type PatientOption = {
  id: string;
  full_name: string;
};

const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  text: "Texto curto",
  textarea: "Texto longo",
  number: "Numero",
  date: "Data",
  boolean: "Caixa de marcar",
  single_choice: "Escolha unica",
  multiple_choice: "Multipla escolha",
};

function makeQuestionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `q_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  }
  return `q_${Math.random().toString(36).slice(2, 14)}`;
}

function emptyQuestion(): QuestionDraft {
  return {
    id: makeQuestionId(),
    label: "",
    type: "text",
    required: true,
    placeholder: "",
    optionsText: "",
  };
}

function normalizeQuestion(draft: QuestionDraft) {
  const base = {
    id: draft.id,
    label: draft.label.trim(),
    type: draft.type,
    required: draft.required,
    placeholder: draft.placeholder.trim() || undefined,
  };

  if (draft.type === "single_choice" || draft.type === "multiple_choice") {
    const options = draft.optionsText
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean);
    return { ...base, options };
  }

  return base;
}

export function AnamnesisBuilder({
  templates,
  patients,
}: {
  templates: TemplateOption[];
  patients: PatientOption[];
}) {
  const [templateOptions, setTemplateOptions] = useState<TemplateOption[]>(templates);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<QuestionDraft[]>([emptyQuestion()]);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id ?? "");
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [expiresInHours, setExpiresInHours] = useState("72");
  const [generatedLink, setGeneratedLink] = useState("");

  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);
  const [pendingTemplate, startTemplateTransition] = useTransition();
  const [pendingLink, startLinkTransition] = useTransition();

  const canCreateTemplate = useMemo(() => {
    return title.trim().length > 0 && questions.some((question) => question.label.trim().length > 0);
  }, [title, questions]);

  const addQuestion = () => {
    setQuestions((prev) => [...prev, emptyQuestion()]);
  };

  const updateQuestion = (id: string, patch: Partial<QuestionDraft>) => {
    setQuestions((prev) =>
      prev.map((question) => (question.id === id ? { ...question, ...patch } : question))
    );
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => {
      const next = prev.filter((question) => question.id !== id);
      return next.length > 0 ? next : [emptyQuestion()];
    });
  };

  const copyLink = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
      setToast({ message: "Link copiado.", variant: "success" });
    } catch {
      setToast({ message: "Nao foi possivel copiar o link.", variant: "error" });
    }
  };

  return (
    <div className="space-y-6">
      {toast ? (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      ) : null}

      <section className="space-y-3 rounded-lg border p-4">
        <div>
          <h3 className="text-sm font-semibold">1) Criar modelo de anamnese</h3>
          <p className="text-xs text-muted-foreground">
            Monte perguntas personalizadas para cada clinica.
          </p>
        </div>

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canCreateTemplate) {
              setToast({ message: "Preencha titulo e ao menos uma pergunta.", variant: "error" });
              return;
            }

            const payload = questions.map((question) => normalizeQuestion(question));
            const formData = new FormData();
            formData.set("title", title.trim());
            formData.set("description", description.trim());
            formData.set("questions_json", JSON.stringify(payload));

            startTemplateTransition(async () => {
              const result = await createAnamnesisTemplateAction(formData);
              if (!result.ok) {
                setToast({ message: result.error, variant: "error" });
                return;
              }

              if (result.template) {
                setTemplateOptions((prev) => [result.template!, ...prev]);
                setSelectedTemplateId(result.template.id);
              }
              setTitle("");
              setDescription("");
              setQuestions([emptyQuestion()]);
              setToast({ message: "Modelo de anamnese criado.", variant: "success" });
            });
          }}
        >
          <Input
            placeholder="Titulo da anamnese"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
          <textarea
            className="min-h-20 w-full rounded-2xl border border-input bg-white px-4 py-3 text-sm text-foreground"
            placeholder="Descricao opcional"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />

          <div className="space-y-3">
            {questions.map((question, index) => {
              const isChoice =
                question.type === "single_choice" || question.type === "multiple_choice";
              return (
                <div key={question.id} className="rounded-lg border bg-card p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold">Pergunta {index + 1}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeQuestion(question.id)}
                    >
                      Remover
                    </Button>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <Input
                      placeholder="Pergunta"
                      value={question.label}
                      onChange={(event) => updateQuestion(question.id, { label: event.target.value })}
                    />
                    <select
                      className="h-10 rounded-2xl border border-input bg-white px-3 text-sm text-foreground"
                      value={question.type}
                      onChange={(event) =>
                        updateQuestion(question.id, {
                          type: event.target.value as QuestionType,
                          optionsText:
                            event.target.value === "single_choice" ||
                            event.target.value === "multiple_choice"
                              ? question.optionsText
                              : "",
                        })
                      }
                    >
                      {Object.entries(QUESTION_TYPE_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <Input
                      placeholder="Placeholder opcional"
                      value={question.placeholder}
                      onChange={(event) =>
                        updateQuestion(question.id, { placeholder: event.target.value })
                      }
                    />
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={question.required}
                        onChange={(event) =>
                          updateQuestion(question.id, { required: event.target.checked })
                        }
                      />
                      Campo obrigatorio
                    </label>
                  </div>

                  {isChoice ? (
                    <div className="mt-2">
                      <textarea
                        className="min-h-20 w-full rounded-2xl border border-input bg-white px-4 py-3 text-sm text-foreground"
                        placeholder={"Opcoes (uma por linha)\nEx: Sim\nNao"}
                        value={question.optionsText}
                        onChange={(event) =>
                          updateQuestion(question.id, { optionsText: event.target.value })
                        }
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={addQuestion}>
              Adicionar pergunta
            </Button>
            <Button type="submit" disabled={pendingTemplate || !canCreateTemplate}>
              {pendingTemplate ? "Salvando..." : "Salvar modelo"}
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <div>
          <h3 className="text-sm font-semibold">2) Gerar link de anamnese</h3>
          <p className="text-xs text-muted-foreground">
            Envie para o paciente como no cadastro rapido do WhatsApp.
          </p>
        </div>

        <form
          className="grid gap-3 md:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!selectedTemplateId) {
              setToast({ message: "Selecione um modelo de anamnese.", variant: "error" });
              return;
            }

            const formData = new FormData();
            formData.set("template_id", selectedTemplateId);
            formData.set("patient_id", selectedPatientId);
            formData.set("expires_in_hours", expiresInHours || "72");

            startLinkTransition(async () => {
              const result = await generateAnamnesisLinkAction(formData);
              if (!result.ok || !result.url) {
                const message = result.ok ? "Falha ao gerar link." : result.error;
                setToast({ message, variant: "error" });
                return;
              }
              setGeneratedLink(result.url);
              setToast({ message: "Link gerado com sucesso.", variant: "success" });
            });
          }}
        >
          <select
            className="h-10 rounded-2xl border border-input bg-white px-3 text-sm text-foreground"
            value={selectedTemplateId}
            onChange={(event) => setSelectedTemplateId(event.target.value)}
          >
            <option value="">Selecione um modelo</option>
            {templateOptions.map((template) => (
              <option key={template.id} value={template.id}>
                {template.title}
              </option>
            ))}
          </select>

          <select
            className="h-10 rounded-2xl border border-input bg-white px-3 text-sm text-foreground"
            value={selectedPatientId}
            onChange={(event) => setSelectedPatientId(event.target.value)}
          >
            <option value="">Paciente opcional</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.full_name}
              </option>
            ))}
          </select>

          <Input
            type="number"
            min={1}
            max={168}
            value={expiresInHours}
            onChange={(event) => setExpiresInHours(event.target.value)}
            placeholder="Horas de validade"
          />

          <div className="md:col-span-3">
            <Button type="submit" disabled={pendingLink}>
              {pendingLink ? "Gerando..." : "Gerar link"}
            </Button>
          </div>
        </form>

        {generatedLink ? (
          <div className="space-y-2">
            <Input value={generatedLink} readOnly onFocus={(event) => event.currentTarget.select()} />
            <Button type="button" variant="outline" onClick={copyLink}>
              Copiar link
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

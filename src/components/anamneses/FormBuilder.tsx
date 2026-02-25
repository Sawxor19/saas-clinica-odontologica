"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyPublicLinkButton } from "@/app/anamneses/CopyPublicLinkButton";

type FieldType =
  | "text"
  | "textarea"
  | "select"
  | "radio"
  | "checkbox"
  | "date"
  | "yes_no"
  | "number";

type BuilderField = {
  id: string;
  label: string;
  help_text: string;
  type: FieldType;
  required: boolean;
  options: string[];
};

type BuilderForm = {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "published" | "archived";
  public_slug: string;
  fields: Array<{
    id: string;
    label: string;
    help_text: string | null;
    type: FieldType;
    required: boolean;
    options: string[] | null;
  }>;
};

function statusLabel(status: BuilderForm["status"]) {
  if (status === "published") return "Publicada";
  if (status === "archived") return "Arquivada";
  return "Rascunho";
}

function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function defaultField(type: FieldType): BuilderField {
  const base = {
    id: randomId(),
    label: "Nova pergunta",
    help_text: "",
    type,
    required: false,
    options: [] as string[],
  };
  if (type === "select" || type === "radio" || type === "checkbox") {
    base.options = ["Opcao 1", "Opcao 2"];
  }
  return base;
}

function isOptionField(type: FieldType) {
  return type === "select" || type === "radio" || type === "checkbox";
}

const CATALOG: Array<{ type: FieldType; label: string }> = [
  { type: "text", label: "Texto curto" },
  { type: "textarea", label: "Texto longo" },
  { type: "yes_no", label: "Sim/Nao" },
  { type: "date", label: "Data" },
  { type: "number", label: "Numero" },
  { type: "select", label: "Selecao" },
  { type: "radio", label: "Multipla escolha" },
  { type: "checkbox", label: "Checkbox" },
];

export function FormBuilder({
  initialForm,
  publicUrl,
  saveAction,
}: {
  initialForm: BuilderForm;
  publicUrl: string;
  saveAction: (formData: FormData) => Promise<void>;
}) {
  const [title, setTitle] = useState(initialForm.title);
  const [description, setDescription] = useState(initialForm.description ?? "");
  const [fields, setFields] = useState<BuilderField[]>(
    initialForm.fields.map((field) => ({
      id: field.id,
      label: field.label,
      help_text: field.help_text ?? "",
      type: field.type,
      required: field.required,
      options: field.options ?? [],
    }))
  );

  const payload = useMemo(
    () =>
      JSON.stringify({
        title,
        description,
        fields: fields.map((field, index) => ({
          label: field.label,
          help_text: field.help_text,
          type: field.type,
          required: field.required,
          order_index: index,
          options: isOptionField(field.type) ? field.options : null,
        })),
      }),
    [description, fields, title]
  );

  return (
    <form action={saveAction} className="space-y-6">
      <input type="hidden" name="payload" value={payload} />

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Editor de anamnese</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Status atual: {statusLabel(initialForm.status)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CopyPublicLinkButton url={publicUrl} />
            <Link href={`/p/anamnese/${initialForm.public_slug}`} target="_blank">
              <Button type="button" variant="outline" size="sm">
                Pre-visualizar
              </Button>
            </Link>
            <Button type="submit" name="intent" value="save" size="sm" variant="outline">
              Salvar
            </Button>
            <Button type="submit" name="intent" value="publish" size="sm" disabled={fields.length === 0}>
              Publicar
            </Button>
            <Button type="submit" name="intent" value="archive" size="sm" variant="outline">
              Arquivar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Titulo da anamnese"
            />
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Descricao (opcional)"
            />
          </div>
          <div className="rounded-xl border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
            Os dados coletados estarao protegidos pela LGPD e serao utilizados apenas para fins
            clinicos.
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Catalogo de caixas</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {CATALOG.map((item) => (
              <Button
                key={item.type}
                type="button"
                variant="outline"
                onClick={() => setFields((prev) => [...prev, defaultField(item.type)])}
              >
                {item.label}
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Perguntas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Nenhum campo adicionado. Use o catalogo para criar sua primeira pergunta.
              </div>
            ) : null}

            {fields.map((field, index) => (
              <div key={field.id} className="space-y-3 rounded-xl border p-4">
                <div className="grid gap-2 md:grid-cols-2">
                  <Input
                    value={field.label}
                    onChange={(event) =>
                      setFields((prev) =>
                        prev.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, label: event.target.value } : item
                        )
                      )
                    }
                    placeholder="Pergunta"
                  />
                  <select
                    value={field.type}
                    onChange={(event) => {
                      const nextType = event.target.value as FieldType;
                      setFields((prev) =>
                        prev.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                type: nextType,
                                options: isOptionField(nextType) ? item.options : [],
                              }
                            : item
                        )
                      );
                    }}
                    className="h-11 rounded-2xl border border-input bg-white px-4 text-sm text-foreground"
                  >
                    {CATALOG.map((option) => (
                      <option key={option.type} value={option.type}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  value={field.help_text}
                  onChange={(event) =>
                    setFields((prev) =>
                      prev.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, help_text: event.target.value } : item
                      )
                    )
                  }
                  placeholder="Texto de ajuda (opcional)"
                />

                {isOptionField(field.type) ? (
                  <textarea
                    value={field.options.join("\n")}
                    onChange={(event) =>
                      setFields((prev) =>
                        prev.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                options: event.target.value
                                  .split("\n")
                                  .map((option) => option.trim())
                                  .filter((option) => option.length > 0),
                              }
                            : item
                        )
                      )
                    }
                    rows={4}
                    className="w-full rounded-2xl border border-input bg-white px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    placeholder="Uma opcao por linha"
                  />
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(event) =>
                        setFields((prev) =>
                          prev.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, required: event.target.checked }
                              : item
                          )
                        )
                      }
                    />
                    Obrigatorio
                  </label>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={index === 0}
                    onClick={() =>
                      setFields((prev) => {
                        if (index === 0) return prev;
                        const next = [...prev];
                        const [current] = next.splice(index, 1);
                        next.splice(index - 1, 0, current);
                        return next;
                      })
                    }
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={index === fields.length - 1}
                    onClick={() =>
                      setFields((prev) => {
                        if (index >= prev.length - 1) return prev;
                        const next = [...prev];
                        const [current] = next.splice(index, 1);
                        next.splice(index + 1, 0, current);
                        return next;
                      })
                    }
                  >
                    ↓
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() =>
                      setFields((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
                    }
                  >
                    Remover
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </form>
  );
}

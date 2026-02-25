"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CaptchaPayload = {
  a: number;
  b: number;
  token: string;
};

type Question = {
  id: string;
  label: string;
  type: "text" | "textarea" | "number" | "date" | "boolean" | "single_choice" | "multiple_choice";
  required?: boolean;
  placeholder?: string;
  options?: string[];
};

type Template = {
  title: string;
  description?: string | null;
  questions: Question[];
};

function maskCPF(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})$/, "$1.$2.$3-$4");
}

function questionFieldName(questionId: string) {
  return `question_${questionId}`;
}

function todayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function AnamnesisPublicForm({
  action,
  captcha,
  template,
  patientNameHint,
}: {
  action: (formData: FormData) => void;
  captcha: CaptchaPayload;
  template: Template;
  patientNameHint?: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [signatureData, setSignatureData] = useState("");
  const [signatureError, setSignatureError] = useState<string | null>(null);
  const [cpf, setCpf] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(width * ratio));
      canvas.height = Math.max(1, Math.floor(height * ratio));
      const context = canvas.getContext("2d");
      if (context) {
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.lineWidth = 2;
        context.lineCap = "round";
        context.strokeStyle = "#111";
      }
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const rect = canvas.getBoundingClientRect();
    context.beginPath();
    context.moveTo(event.clientX - rect.left, event.clientY - rect.top);
    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    setSignatureError(null);
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const rect = canvas.getBoundingClientRect();
    context.lineTo(event.clientX - rect.left, event.clientY - rect.top);
    context.stroke();
  };

  const handlePointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.releasePointerCapture(event.pointerId);
    setSignatureData(canvas.toDataURL("image/png"));
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    context?.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData("");
    setSignatureError(null);
  };

  return (
    <form
      className="space-y-4"
      action={action}
      onSubmit={(event) => {
        if (!signatureData) {
          event.preventDefault();
          setSignatureError("Assinatura obrigatoria.");
        }
      }}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <Input
          name="full_name"
          placeholder={patientNameHint ? `Nome completo (${patientNameHint})` : "Nome completo"}
          required
          defaultValue={patientNameHint ?? ""}
        />
        <Input
          name="cpf"
          placeholder="CPF"
          required
          value={cpf}
          onChange={(event) => setCpf(maskCPF(event.target.value))}
        />
      </div>

      <div className="space-y-3 rounded-lg border p-3">
        <h3 className="text-sm font-semibold">Perguntas da anamnese</h3>
        {template.questions.map((question) => {
          const fieldName = questionFieldName(question.id);
          const isRequired = Boolean(question.required);

          if (question.type === "textarea") {
            return (
              <div key={question.id} className="space-y-1">
                <label className="text-sm font-medium">
                  {question.label} {isRequired ? "*" : ""}
                </label>
                <textarea
                  name={fieldName}
                  required={isRequired}
                  placeholder={question.placeholder || ""}
                  className="min-h-24 w-full rounded-2xl border border-input bg-white px-4 py-3 text-sm text-foreground"
                />
              </div>
            );
          }

          if (question.type === "single_choice") {
            return (
              <div key={question.id} className="space-y-1">
                <label className="text-sm font-medium">
                  {question.label} {isRequired ? "*" : ""}
                </label>
                <div className="space-y-1">
                  {(question.options ?? []).map((option) => (
                    <label key={`${question.id}_${option}`} className="flex items-center gap-2 text-sm">
                      <input type="radio" name={fieldName} value={option} required={isRequired} />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
            );
          }

          if (question.type === "multiple_choice") {
            return (
              <div key={question.id} className="space-y-1">
                <label className="text-sm font-medium">
                  {question.label} {isRequired ? "*" : ""}
                </label>
                <div className="space-y-1">
                  {(question.options ?? []).map((option) => (
                    <label key={`${question.id}_${option}`} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name={fieldName} value={option} />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
            );
          }

          if (question.type === "boolean") {
            return (
              <label key={question.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name={fieldName} value="true" required={isRequired} />
                {question.label} {isRequired ? "*" : ""}
              </label>
            );
          }

          return (
            <div key={question.id} className="space-y-1">
              <label className="text-sm font-medium">
                {question.label} {isRequired ? "*" : ""}
              </label>
              <Input
                name={fieldName}
                type={question.type === "number" ? "number" : question.type === "date" ? "date" : "text"}
                required={isRequired}
                placeholder={question.placeholder || ""}
              />
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium">Data da assinatura *</label>
          <Input name="signed_date" type="date" required defaultValue={todayDateInputValue()} />
        </div>
        <label className="mt-6 inline-flex items-center gap-2 text-sm">
          <input type="checkbox" name="confirm_identity" value="true" required />
          Confirmo que os dados conferem com meu cadastro.
        </label>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Captcha</label>
        <div className="text-sm text-muted-foreground">
          Quanto e {captcha.a} + {captcha.b}?
        </div>
        <Input name="captcha_answer" placeholder="Resposta" required />
        <input type="hidden" name="captcha_a" value={captcha.a} />
        <input type="hidden" name="captcha_b" value={captcha.b} />
        <input type="hidden" name="captcha_token" value={captcha.token} />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Assinatura digital</label>
        <div className="rounded-md border border-dashed p-2">
          <canvas
            ref={canvasRef}
            className="h-32 w-full touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
        </div>
        <input type="hidden" name="signature_data" value={signatureData} />
        {signatureError ? <p className="text-xs text-destructive">{signatureError}</p> : null}
        <Button type="button" variant="outline" size="sm" onClick={clearSignature}>
          Limpar assinatura
        </Button>
      </div>

      <Button type="submit" className="w-full">
        Enviar anamnese
      </Button>
    </form>
  );
}

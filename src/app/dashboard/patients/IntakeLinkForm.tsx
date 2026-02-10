"use client";

import { useState, useTransition } from "react";
import { sendIntakeLinkAction } from "@/app/dashboard/patients/send-intake-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toast } from "@/components/ui/toast";

export function IntakeLinkForm() {
  const [pending, startTransition] = useTransition();
  const [generatedLink, setGeneratedLink] = useState("");
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(
    null
  );

  const copyLink = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
      setToast({ message: "Link copiado", variant: "success" });
    } catch {
      setToast({ message: "Não foi possível copiar o link", variant: "error" });
    }
  };

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
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const formData = new FormData(form);
          startTransition(async () => {
            const result = await sendIntakeLinkAction(formData);
            if (!result.ok) {
              setToast({ message: result.error, variant: "error" });
              return;
            }
            setGeneratedLink(result.url);
            setToast({ message: "Link gerado. Copie abaixo.", variant: "success" });
            form.reset();
          });
        }}
      >
        <Button type="submit" disabled={pending}>
          {pending ? "Gerando..." : "Gerar link de cadastro"}
        </Button>
      </form>

      {generatedLink ? (
        <div className="mt-4 grid gap-2">
          <label className="text-sm font-medium">Link de cadastro</label>
          <div className="flex flex-col gap-2 md:flex-row">
            <Input
              value={generatedLink}
              readOnly
              onFocus={(event) => event.currentTarget.select()}
            />
            <Button type="button" variant="outline" onClick={copyLink}>
              Copiar link
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Copie o link e envie pelo WhatsApp que já está aberto no computador.
          </p>
        </div>
      ) : null}
    </>
  );
}

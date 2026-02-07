"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData(event.currentTarget);
    const payload = {
      clinicName: String(formData.get("clinicName") || "").trim(),
      adminName: String(formData.get("adminName") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      password: String(formData.get("password") || ""),
      cpf: String(formData.get("cpf") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
    };

    const response = await fetch("/api/signup/intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data?.error || "Falha ao iniciar cadastro.");
      setLoading(false);
      return;
    }

    router.push(`/signup/verify?intentId=${data.intentId}`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Crie sua conta</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <Input name="clinicName" placeholder="Nome da clínica" required />
            <Input name="adminName" placeholder="Nome do admin" required />
            <Input name="email" type="email" placeholder="Email" required />
            <div className="grid gap-1">
              <Input
                name="password"
                type="password"
                placeholder="Senha"
                minLength={8}
                required
              />
              <span className="text-xs text-muted-foreground">Mínimo de 8 caracteres.</span>
            </div>
            <Input name="cpf" placeholder="CPF do responsável" required />
            <Input name="phone" placeholder="Telefone/WhatsApp (com DDD)" required />
            {error ? (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            ) : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Enviando..." : "Criar conta"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DocumentType,
  documentTypeLabel,
  validateDocumentByType,
} from "@/utils/validation/document";
import {
  getPasswordChecks,
  getPasswordStrengthLabel,
  isStrongPassword,
} from "@/utils/validation/password";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [confirmEmail, setConfirmEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [documentType, setDocumentType] = React.useState<DocumentType>("cpf");

  const passwordChecks = React.useMemo(() => getPasswordChecks(password), [password]);
  const passwordStrengthLabel = getPasswordStrengthLabel(passwordChecks.score);
  const passwordProgress = passwordChecks.score * 25;

  const emailMatches =
    !confirmEmail ||
    email.trim().toLowerCase() === confirmEmail.trim().toLowerCase();
  const passwordsMatch = !confirmPassword || password === confirmPassword;

  const documentPlaceholder =
    documentType === "cnpj" ? "CNPJ do responsavel" : "CPF do responsavel";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const emailValue = String(formData.get("email") || "").trim();
    const confirmEmailValue = String(formData.get("confirmEmail") || "").trim();
    const passwordValue = String(formData.get("password") || "");
    const confirmPasswordValue = String(formData.get("confirmPassword") || "");
    const documentTypeRaw = String(formData.get("documentType") || "cpf").toLowerCase();
    const documentTypeValue: DocumentType = documentTypeRaw === "cnpj" ? "cnpj" : "cpf";
    const documentNumber = String(formData.get("documentNumber") || "").trim();

    if (emailValue.toLowerCase() !== confirmEmailValue.toLowerCase()) {
      setError("Os e-mails nao conferem.");
      setLoading(false);
      return;
    }

    if (passwordValue !== confirmPasswordValue) {
      setError("As senhas nao conferem.");
      setLoading(false);
      return;
    }

    if (!isStrongPassword(passwordValue)) {
      setError(
        "Use uma senha forte: minimo 8 caracteres, 1 maiuscula, 1 minuscula e 1 especial."
      );
      setLoading(false);
      return;
    }

    if (!validateDocumentByType(documentNumber, documentTypeValue)) {
      setError(`${documentTypeLabel(documentTypeValue)} invalido.`);
      setLoading(false);
      return;
    }

    const payload = {
      adminName: String(formData.get("adminName") || "").trim(),
      email: emailValue,
      password: passwordValue,
      documentType: documentTypeValue,
      documentNumber,
      phone: String(formData.get("phone") || "").trim(),
      timezone: String(formData.get("timezone") || "").trim(),
      address: String(formData.get("address") || "").trim(),
      cep: String(formData.get("cep") || "").trim(),
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
    <div className="saas-scene-dark flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-2xl border-slate-200/70 bg-white/92 shadow-2xl backdrop-blur">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center">
            <Image
              src="/logo-off.png"
              alt="E-Clinic"
              width={48}
              height={48}
              className="h-12 w-12 object-contain drop-shadow-[0_0_14px_rgba(8,47,73,0.28)]"
            />
          </div>
          <CardTitle>Crie sua conta</CardTitle>
          <p className="text-sm text-muted-foreground">Configure seu acesso e inicie o trial</p>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <Input
              name="adminName"
              placeholder="Nome do responsavel"
              autoComplete="name"
              className="md:col-span-2"
              required
            />
            <Input
              name="email"
              type="email"
              placeholder="Email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <Input
              name="confirmEmail"
              type="email"
              placeholder="Confirmar email"
              autoComplete="email"
              value={confirmEmail}
              onChange={(event) => setConfirmEmail(event.target.value)}
              required
            />
            {!emailMatches ? (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive md:col-span-2">
                Os e-mails nao conferem.
              </div>
            ) : null}
            <div className="grid gap-1">
              <Input
                name="password"
                type="password"
                placeholder="Senha"
                autoComplete="new-password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-1">
              <Input
                name="confirmPassword"
                type="password"
                placeholder="Confirmar senha"
                autoComplete="new-password"
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </div>
            {!passwordsMatch ? (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive md:col-span-2">
                As senhas nao conferem.
              </div>
            ) : null}
            <div className="space-y-2 rounded-md border border-border/70 p-3 md:col-span-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <span>Forca da senha</span>
                <span className="uppercase">{passwordStrengthLabel}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={
                    passwordProgress >= 100
                      ? "h-full bg-emerald-500"
                      : passwordProgress >= 50
                        ? "h-full bg-amber-500"
                        : "h-full bg-destructive"
                  }
                  style={{ width: `${passwordProgress}%` }}
                />
              </div>
              <div className="grid gap-1 text-xs text-muted-foreground md:grid-cols-2">
                <span
                  className={
                    passwordChecks.hasUppercase ? "text-emerald-700" : "text-muted-foreground"
                  }
                >
                  1 letra maiuscula
                </span>
                <span
                  className={
                    passwordChecks.hasLowercase ? "text-emerald-700" : "text-muted-foreground"
                  }
                >
                  1 letra minuscula
                </span>
                <span
                  className={
                    passwordChecks.hasSpecialChar
                      ? "text-emerald-700"
                      : "text-muted-foreground"
                  }
                >
                  1 caractere especial
                </span>
                <span
                  className={
                    passwordChecks.hasMinLength ? "text-emerald-700" : "text-muted-foreground"
                  }
                >
                  Minimo de 8 caracteres
                </span>
              </div>
            </div>
            <label className="grid gap-1 text-sm">
              <span className="px-1 text-muted-foreground">Tipo de documento</span>
              <select
                name="documentType"
                value={documentType}
                onChange={(event) => setDocumentType(event.target.value as DocumentType)}
                className="h-11 rounded-2xl border border-input bg-white px-4 text-sm text-foreground shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                <option value="cpf">CPF</option>
                <option value="cnpj">CNPJ</option>
              </select>
            </label>
            <Input
              name="documentNumber"
              placeholder={documentPlaceholder}
              autoComplete="off"
              required
            />
            <Input
              name="phone"
              placeholder="Telefone/WhatsApp (com DDD)"
              autoComplete="tel"
              required
            />
            <Input name="timezone" placeholder="Timezone (ex: America/Sao_Paulo)" required />
            <Input
              name="address"
              placeholder="Endereco"
              autoComplete="street-address"
              className="md:col-span-2"
              required
            />
            <Input name="cep" placeholder="CEP" autoComplete="postal-code" required />
            {error ? (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive md:col-span-2">
                {error}
              </div>
            ) : null}
            <Button type="submit" className="w-full md:col-span-2" disabled={loading}>
              {loading ? "Enviando..." : "Criar conta"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

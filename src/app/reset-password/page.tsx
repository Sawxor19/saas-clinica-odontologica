"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseClient } from "@/server/db/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const supabase = supabaseClient();
    const code = searchParams.get("code");

    const init = async () => {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setStatus("error");
          setMessage("Link inválido ou expirado. Solicite um novo email.");
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setStatus("error");
        setMessage("Link inválido ou expirado. Solicite um novo email.");
        return;
      }
      setSessionReady(true);
    };

    void init();
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      setStatus("error");
      setMessage("A senha deve ter no mínimo 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("As senhas não conferem.");
      return;
    }

    setStatus("loading");
    setMessage(null);

    const supabase = supabaseClient();
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setStatus("error");
      setMessage("Sessão ausente. Abra novamente o link do email.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("success");
    setMessage("Senha atualizada com sucesso. Faça login novamente.");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Definir nova senha</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {message ? (
            <div
              className={`rounded-md border p-3 text-sm ${
                status === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              {message}
            </div>
          ) : null}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              name="password"
              type="password"
              placeholder="Nova senha"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={!sessionReady || status === "loading"}
            />
            <Input
              name="confirmPassword"
              type="password"
              placeholder="Confirmar senha"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              disabled={!sessionReady || status === "loading"}
            />
            <Button
              className="w-full"
              type="submit"
              disabled={!sessionReady || status === "loading"}
            >
              Atualizar senha
            </Button>
          </form>
          <div className="text-center">
            <a className="text-sm text-muted-foreground hover:text-foreground" href="/login">
              Voltar para o login
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

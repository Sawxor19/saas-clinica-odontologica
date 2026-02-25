import Image from "next/image";
import { loginAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  return (
    <div className="saas-scene-dark flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md border-slate-200/70 bg-white/92 shadow-2xl backdrop-blur">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-50 shadow-lg">
            <Image src="/logo.png" alt="E-Clinic" width={40} height={40} className="h-10 w-10 object-contain" />
          </div>
          <CardTitle>Entrar</CardTitle>
          <p className="text-sm text-muted-foreground">Acesse seu painel da clinica</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" action={loginAction}>
            <Input name="email" type="email" placeholder="Email" required />
            <Input name="password" type="password" placeholder="Senha" required />
            <Button className="w-full" type="submit">
              Acessar
            </Button>
          </form>
          <div className="mt-3 text-center">
            <a className="text-sm text-muted-foreground hover:text-foreground" href="/forgot-password">
              Esqueci minha senha
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

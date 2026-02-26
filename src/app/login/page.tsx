import Image from "next/image";
import { loginAction } from "@/app/(auth)/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoginSubmitButton } from "@/app/login/LoginSubmitButton";

export default function LoginPage() {
  return (
    <div className="saas-scene-dark flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md border-slate-200/70 bg-white/92 shadow-2xl backdrop-blur">
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
          <CardTitle>Entrar</CardTitle>
          <p className="text-sm text-muted-foreground">Acesse seu painel da clinica</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" action={loginAction}>
            <Input name="email" type="email" placeholder="Email" required />
            <Input name="password" type="password" placeholder="Senha" required />
            <LoginSubmitButton />
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

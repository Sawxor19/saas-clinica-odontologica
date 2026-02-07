import { loginAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
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

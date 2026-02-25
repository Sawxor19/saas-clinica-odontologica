import Link from "next/link";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/(auth)/actions";

export function Topbar() {
  return (
    <header className="flex items-center justify-between border-b border-border bg-white/80 px-6 py-4 backdrop-blur">
      <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
        Gestao simples e rapida
      </div>
      <div className="flex items-center gap-2">
        <Link href="/dashboard/profile">
          <Button variant="outline" size="sm">
            Meu perfil
          </Button>
        </Link>
        <form action={logoutAction}>
          <Button type="submit" variant="ghost" size="sm">
            Log out
          </Button>
        </form>
      </div>
    </header>
  );
}

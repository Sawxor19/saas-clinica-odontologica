import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Topbar() {
  return (
    <header className="flex items-center justify-between border-b border-border bg-white/80 px-6 py-4 backdrop-blur">
      <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Gestão simples e rápida</div>
      <Link href="/dashboard/profile">
        <Button variant="outline" size="sm">
          Meu perfil
        </Button>
      </Link>
    </header>
  );
}

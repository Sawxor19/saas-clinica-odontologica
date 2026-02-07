import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Topbar() {
  return (
    <header className="flex items-center justify-between border-b bg-card px-6 py-4">
      <div className="text-sm text-muted-foreground">Gestão simples e rápida</div>
      <Link href="/dashboard/profile">
        <Button variant="outline" size="sm">
          Meu perfil
        </Button>
      </Link>
    </header>
  );
}

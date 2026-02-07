import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Wallet,
  Shield,
  Boxes,
  Stethoscope,
  BarChart3,
} from "lucide-react";
import { getClinicContext } from "@/server/auth/context";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/patients", label: "Pacientes", icon: Users },
  { href: "/dashboard/schedule", label: "Agenda", icon: CalendarDays },
  { href: "/dashboard/reports", label: "Relatórios", icon: BarChart3 },
  { href: "/dashboard/procedures", label: "Procedimentos", icon: Stethoscope },
  { href: "/dashboard/materials", label: "Materiais", icon: Boxes },
  { href: "/dashboard/finance", label: "Financeiro", icon: Wallet },
  { href: "/dashboard/users", label: "Equipe", icon: Users },
  { href: "/dashboard/audit", label: "Auditoria", icon: Shield },
];

export async function Sidebar({ className }: { className?: string }) {
  const { permissions } = await getClinicContext();
  const filtered = navItems.filter((item) => {
    if (item.href.startsWith("/dashboard/reports")) return permissions.readFinance;
    if (item.href.startsWith("/dashboard/procedures")) return permissions.manageProcedures || permissions.readProcedures;
    if (item.href.startsWith("/dashboard/materials")) return permissions.manageInventory;
    if (item.href.startsWith("/dashboard/finance")) return permissions.readFinance;
    if (item.href.startsWith("/dashboard/users")) return permissions.manageUsers;
    if (item.href.startsWith("/dashboard/audit")) return permissions.viewAudit;
    return true;
  });
  return (
    <aside className={cn("w-64 border-r bg-card", className)}>
      <div className="px-6 py-5 text-lg font-semibold">E-Clinic!</div>
      <nav className="space-y-1 px-3">
        {filtered.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:-translate-y-0.5 hover:bg-accent hover:text-foreground hover:shadow-lg hover:shadow-emerald-500/10"
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

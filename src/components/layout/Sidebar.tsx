import Image from "next/image";
import { cn } from "@/lib/utils";
import { getClinicContext } from "@/server/auth/context";
import { SidebarNav } from "@/components/layout/SidebarNav";

type IconKey =
  | "dashboard"
  | "patients"
  | "schedule"
  | "reports"
  | "procedures"
  | "materials"
  | "finance"
  | "users"
  | "audit";

const navItems: Array<{ href: string; label: string; iconKey: IconKey }> = [
  { href: "/dashboard", label: "Dashboard", iconKey: "dashboard" },
  { href: "/dashboard/patients", label: "Pacientes", iconKey: "patients" },
  { href: "/dashboard/schedule", label: "Agenda", iconKey: "schedule" },
  { href: "/dashboard/reports", label: "Relatórios", iconKey: "reports" },
  { href: "/dashboard/procedures", label: "Procedimentos", iconKey: "procedures" },
  { href: "/dashboard/materials", label: "Materiais", iconKey: "materials" },
  { href: "/dashboard/finance", label: "Financeiro", iconKey: "finance" },
  { href: "/dashboard/users", label: "Equipe", iconKey: "users" },
  { href: "/dashboard/audit", label: "Auditoria", iconKey: "audit" },
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
    <aside
      className={cn(
        "sticky top-0 flex h-screen w-16 flex-col border-r border-border bg-white/80 py-6 backdrop-blur sm:w-20 lg:w-64",
        className
      )}
    >
      <div className="px-4 pb-6 lg:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden">
            <Image
              src="/logo-off.png"
              alt="E-Clinic"
              width={34}
              height={34}
              className="h-8 w-8 object-contain drop-shadow-[0_0_10px_rgba(14,116,144,0.22)]"
            />
          </div>
          <div className="hidden lg:block">
            <div className="text-base font-semibold">E-Clinic</div>
            <div className="text-xs text-muted-foreground">Dental OS</div>
          </div>
        </div>
      </div>
      <SidebarNav items={filtered} />
    </aside>
  );
}

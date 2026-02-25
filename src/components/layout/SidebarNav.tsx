"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Wallet,
  Shield,
  Boxes,
  Stethoscope,
  FileText,
  BarChart3,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = {
  dashboard: LayoutDashboard,
  patients: Users,
  anamneses: ClipboardList,
  schedule: CalendarDays,
  budgets: FileText,
  reports: BarChart3,
  procedures: Stethoscope,
  materials: Boxes,
  finance: Wallet,
  users: Users,
  audit: Shield,
} satisfies Record<string, LucideIcon>;

type NavItem = {
  href: string;
  label: string;
  iconKey: keyof typeof ICONS;
};

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-2 px-3">
      {items.map((item) => {
        const active =
          pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
        const Icon = ICONS[item.iconKey] ?? LayoutDashboard;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-border hover:bg-muted hover:text-foreground",
              active &&
                "border-primary/20 bg-primary/10 text-foreground shadow-[0_12px_28px_rgba(37,99,235,0.18)]"
            )}
          >
            <span
              className={cn(
                "absolute left-1 h-6 w-1 rounded-full bg-primary opacity-0 transition-opacity",
                active && "opacity-100"
              )}
              aria-hidden="true"
            />
            <div className={cn(
              "flex h-9 w-9 items-center justify-center rounded-2xl border border-border bg-muted text-muted-foreground transition-colors group-hover:text-foreground",
              active && "text-primary border-primary/20 bg-primary/10"
            )}>
              <Icon className="h-4 w-4" />
            </div>
            <span className="hidden text-sm lg:inline">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

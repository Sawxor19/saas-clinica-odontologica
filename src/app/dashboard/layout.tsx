import { Suspense } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { DashboardOnboarding } from "@/components/layout/DashboardOnboarding";
import { DashboardEntrySplash } from "@/components/layout/DashboardEntrySplash";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="saas-scene-light flex min-h-screen">
      <DashboardEntrySplash />
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar />
        <main className="flex-1 bg-white/88 backdrop-blur-[1px]">{children}</main>
        <Suspense fallback={null}>
          <DashboardOnboarding />
        </Suspense>
      </div>
    </div>
  );
}

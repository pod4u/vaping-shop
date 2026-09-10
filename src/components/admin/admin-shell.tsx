"use client";

import { usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin/login") return <>{children}</>;

  return (
    <div className="admin-layout flex min-h-screen">
      <AdminSidebar />
      <main className="ml-[280px] min-h-screen flex-1 bg-brand-void">
        {children}
      </main>
    </div>
  );
}

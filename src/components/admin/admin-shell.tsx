"use client";

import { usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    if (!mobileOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setMobileOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [mobileOpen]);
  if (pathname === "/admin/login") return <>{children}</>;

  return (
    <div className="admin-layout flex min-h-screen">
      {mobileOpen && <button aria-label="ปิดเมนูแอดมิน" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-black/60 lg:hidden" />}
      <AdminSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <main className="min-w-0 min-h-screen flex-1 bg-brand-void lg:ml-[280px]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 lg:hidden">
          <span className="text-sm text-white/65">Admin Panel</span>
          <button aria-label={mobileOpen ? "ปิดเมนู" : "เปิดเมนู"} aria-controls="admin-navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(!mobileOpen)} className="relative z-50 rounded-lg border border-white/10 p-2 text-white">{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
        {children}
      </main>
    </div>
  );
}

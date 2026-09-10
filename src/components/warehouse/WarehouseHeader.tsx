"use client";

import { useRouter } from "next/navigation";
import { Boxes, LogOut, RefreshCw } from "lucide-react";

export function WarehouseHeader({ onRefresh, refreshing }: { onRefresh?: () => void; refreshing?: boolean }) {
  const router = useRouter();
  async function logout() {
    await fetch("/api/warehouse/auth", { method: "DELETE" });
    router.replace("/warehouse/login");
    router.refresh();
  }
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#071126]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <a href="/warehouse" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d4ff14] text-[#071126]"><Boxes className="h-5 w-5" /></span><div><p className="text-xs font-black tracking-[0.18em] text-[#d4ff14]">POD4U</p><p className="font-black">คลังสินค้า</p></div></a>
        <div className="flex gap-2">
          {onRefresh && <button type="button" onClick={onRefresh} disabled={refreshing} aria-label="โหลดข้อมูลใหม่" className="rounded-xl border border-white/15 p-2.5 text-white/70 hover:text-white disabled:opacity-50"><RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} /></button>}
          <button type="button" onClick={logout} aria-label="ออกจากระบบ" className="rounded-xl border border-white/15 p-2.5 text-white/70 hover:border-red-400/40 hover:text-red-300"><LogOut className="h-5 w-5" /></button>
        </div>
      </div>
    </header>
  );
}

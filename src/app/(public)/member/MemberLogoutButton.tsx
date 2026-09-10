"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function MemberLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <button
      type="button"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        await fetch("/api/customers/member-session", { method: "DELETE" });
        router.replace("/member");
        router.refresh();
      }}
      aria-label="ออกจากระบบสมาชิก"
      className="shrink-0 rounded-2xl border border-white/15 bg-white/[0.04] px-3.5 py-2 text-xs font-bold text-white/60 hover:text-red-300 hover:border-red-400/40 hover:bg-red-500/10 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
    >
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
      <span>{loading ? "กำลังออก..." : "ออกจากระบบ"}</span>
    </button>
  );
}

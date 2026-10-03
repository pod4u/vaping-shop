"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const MIN_REFRESH_GAP_MS = 15_000;

export default function MemberStatusRefresh() {
  const router = useRouter();
  const lastRefreshAt = useRef(Date.now());

  useEffect(() => {
    const refreshIfStale = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastRefreshAt.current < MIN_REFRESH_GAP_MS) return;
      lastRefreshAt.current = now;
      router.refresh();
    };

    window.addEventListener("focus", refreshIfStale);
    window.addEventListener("pageshow", refreshIfStale);
    document.addEventListener("visibilitychange", refreshIfStale);
    const interval = window.setInterval(refreshIfStale, 60_000);
    return () => {
      window.removeEventListener("focus", refreshIfStale);
      window.removeEventListener("pageshow", refreshIfStale);
      document.removeEventListener("visibilitychange", refreshIfStale);
      window.clearInterval(interval);
    };
  }, [router]);

  return (
    <button
      type="button"
      onClick={() => {
        lastRefreshAt.current = Date.now();
        router.refresh();
      }}
      className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-bold text-white/70 hover:border-acid-lime/50 hover:text-acid-lime"
    >
      ↻ อัปเดตสถานะ
    </button>
  );
}

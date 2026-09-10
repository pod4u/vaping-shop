"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function MemberAccessClient() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token = params.get("member_token");
    window.history.replaceState(null, "", window.location.pathname);
    if (!token) {
      setError("ลิงก์เข้าระบบไม่ครบถ้วน กรุณาขอลิงก์ใหม่จาก LINE");
      return;
    }

    void fetch("/api/customers/member-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "ไม่สามารถเข้าระบบสมาชิกได้");
      router.replace("/member");
      router.refresh();
    }).catch((reason) => {
      setError(reason instanceof Error ? reason.message : "ไม่สามารถเข้าระบบสมาชิกได้");
    });
  }, [router]);

  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <div className="vapor-card rounded-2xl border border-navy-border p-8">
        <div className="mb-4 text-4xl" aria-hidden="true">{error ? "⚠️" : "🔐"}</div>
        <h1 className="text-2xl font-black text-white">{error ? "เข้าระบบไม่สำเร็จ" : "กำลังยืนยันสมาชิก"}</h1>
        <p className="mt-3 text-sm text-white/60">{error || "กรุณารอสักครู่ ระบบกำลังเชื่อมบัญชี LINE ของคุณ"}</p>
        {error && <a href="https://lin.ee/RU5qNLj" className="mt-6 inline-flex rounded-full bg-acid-lime px-6 py-3 font-bold text-navy-deep">ขอลิงก์ใหม่จาก LINE</a>}
      </div>
    </div>
  );
}

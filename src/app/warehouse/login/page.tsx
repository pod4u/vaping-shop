"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Boxes, Loader2, LockKeyhole } from "lucide-react";

export default function WarehouseLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/warehouse/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "เข้าสู่ระบบไม่สำเร็จ");
      router.replace("/warehouse");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,255,20,0.12),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.25),transparent_45%)]" />
      <section className="bds-glass-card relative w-full max-w-md rounded-[2rem] p-7 sm:p-9">
        <div className="mb-8 flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d4ff14] text-[#071126]"><Boxes className="h-7 w-7" /></span>
          <div><p className="text-sm font-black tracking-[0.2em] text-[#d4ff14]">POD4U</p><h1 className="text-2xl font-black">ระบบคลังสินค้า</h1></div>
        </div>
        <p className="mb-6 text-sm leading-6 text-white/60">สำหรับทีมแพ็กและจัดส่งสินค้าเท่านั้น</p>
        <form onSubmit={login} className="space-y-4">
          <label className="block text-sm font-bold">ชื่อผู้ใช้
            <input required value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" maxLength={50} className="mt-2 w-full rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3.5 text-white outline-none focus:border-[#d4ff14]" placeholder="กรอกชื่อผู้ใช้" />
          </label>
          <label className="block text-sm font-bold">รหัสผ่าน
            <input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" maxLength={200} className="mt-2 w-full rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3.5 text-white outline-none focus:border-[#d4ff14]" placeholder="กรอกรหัสผ่าน" />
          </label>
          {error && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
          <button disabled={loading} className="btn-liquid-acid flex w-full items-center justify-center gap-2 px-5 py-4 font-black text-[#071126] disabled:opacity-60">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LockKeyhole className="h-5 w-5" />}{loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบคลังสินค้า"}
          </button>
        </form>
      </section>
    </main>
  );
}

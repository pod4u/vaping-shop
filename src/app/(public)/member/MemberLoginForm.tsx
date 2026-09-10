"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function MemberLoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/customers/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "เข้าสู่ระบบไม่สำเร็จ");
      router.replace("/member");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4 text-left">
      <label className="block text-sm font-bold text-white/75">
        เบอร์โทรศัพท์
        <input required type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="0812345678" className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3.5 font-normal text-white outline-none focus:border-acid-lime/60" />
      </label>
      <label className="block text-sm font-bold text-white/75">
        รหัสผ่าน
        <div className="relative mt-1.5">
          <input required type={showPassword ? "text" : "password"} minLength={8} maxLength={72} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3.5 pr-16 font-normal text-white outline-none focus:border-acid-lime/60" />
          <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute inset-y-0 right-0 px-4 text-xs font-bold text-white/50">{showPassword ? "ซ่อน" : "แสดง"}</button>
        </div>
      </label>
      {error && <p role="alert" className="rounded-xl bg-red-400/10 px-3 py-2 text-xs text-red-300">{error}</p>}
      <button disabled={isSubmitting} className="w-full rounded-xl bg-acid-lime px-5 py-3.5 font-black text-navy-deep disabled:opacity-50">{isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบสมาชิก"}</button>
      <div className="grid grid-cols-2 gap-2 text-center text-xs font-bold">
        <Link href="/register" className="rounded-xl border border-white/15 px-3 py-3 text-white/70">สมัครสมาชิกใหม่</Link>
        <a href="https://lin.ee/RU5qNLj" className="rounded-xl border border-white/15 px-3 py-3 text-white/70">ลืมรหัสผ่าน</a>
      </div>
    </form>
  );
}

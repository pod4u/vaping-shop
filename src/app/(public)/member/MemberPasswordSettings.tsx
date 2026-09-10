"use client";

import { FormEvent, useState } from "react";

export default function MemberPasswordSettings({ hasPassword, loginPhone }: { hasPassword: boolean; loginPhone: string }) {
  const [isOpen, setIsOpen] = useState(!hasPassword);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch("/api/customers/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirm_password: confirmPassword }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "ตั้งรหัสผ่านไม่สำเร็จ");
      setPassword("");
      setConfirmPassword("");
      setSaved(true);
      setIsOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "ตั้งรหัสผ่านไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="vapor-card rounded-2xl border border-navy-border p-5 sm:p-6">
      <div className="flex items-start gap-3"><span className="text-2xl" aria-hidden="true">🔐</span><div><h3 className="font-bold text-white">เข้าสู่ระบบผ่านเว็บไซต์</h3><p className="mt-1 text-xs leading-5 text-white/50">ใช้เบอร์โทรศัพท์และรหัสผ่านเข้า Pod4U ได้โดยไม่ต้องเปิด LINE</p></div></div>
      {!isOpen ? (
        <div className="mt-4 border-t border-white/10 pt-4">
          {saved && <p role="status" className="mb-3 text-xs font-bold text-emerald-300">บันทึกรหัสผ่านเรียบร้อยแล้ว</p>}
          <button type="button" onClick={() => setIsOpen(true)} className="w-full rounded-xl border border-acid-lime/40 px-4 py-3 text-sm font-black text-acid-lime">{hasPassword || saved ? "เปลี่ยนรหัสผ่าน" : "ตั้งรหัสผ่านสำหรับเข้าเว็บ"}</button>
        </div>
      ) : (
        <form onSubmit={save} className="mt-4 space-y-3 border-t border-white/10 pt-4">
          <p className="text-xs text-white/50">อย่างน้อย 8 ตัว และต้องมีทั้งตัวอักษรกับตัวเลข</p>
          <input type="text" name="username" autoComplete="username" value={loginPhone} readOnly className="sr-only" aria-label="เบอร์โทรศัพท์สำหรับเข้าสู่ระบบ" />
          <input required type="password" minLength={8} maxLength={72} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="รหัสผ่านใหม่" aria-label="รหัสผ่านใหม่" className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white outline-none focus:border-acid-lime/60" />
          <input required type="password" minLength={8} maxLength={72} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="ยืนยันรหัสผ่าน" aria-label="ยืนยันรหัสผ่าน" className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white outline-none focus:border-acid-lime/60" />
          {error && <p role="alert" className="rounded-xl bg-red-400/10 px-3 py-2 text-xs text-red-300">{error}</p>}
          <div className="grid grid-cols-2 gap-2"><button disabled={isSaving} className="rounded-xl bg-acid-lime px-4 py-3 text-sm font-black text-navy-deep disabled:opacity-50">{isSaving ? "กำลังบันทึก..." : "บันทึกรหัสผ่าน"}</button><button type="button" onClick={() => setIsOpen(false)} className="rounded-xl border border-white/15 px-4 py-3 text-sm font-bold text-white/70">ไว้ภายหลัง</button></div>
        </form>
      )}
    </div>
  );
}

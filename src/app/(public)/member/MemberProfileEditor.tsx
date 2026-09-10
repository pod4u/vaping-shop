"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

interface ProfileValues {
  fullName: string;
  phone: string;
  addressId: string | null;
  recipientName: string;
  address: string;
  province: string;
  postalCode: string;
}

export default function MemberProfileEditor({ values }: { values: ProfileValues }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState(values);

  function setField(field: keyof ProfileValues, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
    setSaved(false);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch("/api/customers/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address_id: form.addressId,
          full_name: form.fullName,
          phone: form.phone,
          recipient_name: form.recipientName,
          address: form.address,
          province: form.province,
          postal_code: form.postalCode,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "บันทึกข้อมูลไม่สำเร็จ");
      setSaved(true);
      setIsOpen(false);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  }

  if (!isOpen) {
    return (
      <div className="mt-5 border-t border-white/10 pt-4">
        <button type="button" onClick={() => setIsOpen(true)} className="w-full rounded-xl border border-acid-lime/40 px-4 py-3 text-sm font-black text-acid-lime transition-colors hover:bg-acid-lime/10">
          แก้ไขชื่อและข้อมูลจัดส่ง
        </button>
        {saved && <p role="status" className="mt-3 text-center text-xs font-bold text-emerald-300">บันทึกข้อมูลเรียบร้อยแล้ว</p>}
      </div>
    );
  }

  return (
    <form onSubmit={save} className="mt-5 space-y-4 border-t border-white/10 pt-4">
      <div>
        <h3 className="font-black text-white">แก้ไขข้อมูลส่วนตัวและที่อยู่</h3>
        <p className="mt-1 text-xs leading-5 text-white/50">ข้อมูลนี้จะใช้กับออเดอร์ใหม่ และอัปเดตออเดอร์ที่ยังไม่ได้ยืนยันให้ทันที</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="ชื่อ-นามสกุลสมาชิก" value={form.fullName} onChange={(value) => setField("fullName", value)} autoComplete="name" />
        <Field label="เบอร์โทรศัพท์" value={form.phone} onChange={(value) => setField("phone", value)} autoComplete="tel" inputMode="tel" />
        <Field label="ชื่อผู้รับสินค้า" value={form.recipientName} onChange={(value) => setField("recipientName", value)} autoComplete="shipping name" />
        <Field label="จังหวัด" value={form.province} onChange={(value) => setField("province", value)} autoComplete="shipping address-level1" />
      </div>
      <label className="block text-sm font-bold text-white/75">
        ที่อยู่จัดส่ง
        <textarea required maxLength={700} rows={4} value={form.address} onChange={(event) => setField("address", event.target.value)} autoComplete="shipping street-address" className="mt-1.5 w-full resize-y rounded-xl border border-white/15 bg-white/5 px-3 py-3 font-normal text-white outline-none focus:border-acid-lime/60" />
      </label>
      <Field label="รหัสไปรษณีย์" value={form.postalCode} onChange={(value) => setField("postalCode", value)} autoComplete="shipping postal-code" inputMode="numeric" maxLength={5} />
      {error && <p role="alert" className="rounded-xl bg-red-400/10 px-3 py-2 text-xs text-red-300">{error}</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        <button disabled={isSaving} className="rounded-xl bg-acid-lime px-4 py-3 text-sm font-black text-navy-deep disabled:opacity-50">{isSaving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}</button>
        <button type="button" disabled={isSaving} onClick={() => { setForm(values); setError(""); setIsOpen(false); }} className="rounded-xl border border-white/15 px-4 py-3 text-sm font-bold text-white/70 disabled:opacity-50">ยกเลิก</button>
      </div>
    </form>
  );
}

function Field({ label, value, onChange, ...props }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  inputMode?: "tel" | "numeric";
  maxLength?: number;
}) {
  return (
    <label className="block text-sm font-bold text-white/75">
      {label}
      <input required value={value} onChange={(event) => onChange(event.target.value)} {...props} className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-3 font-normal text-white outline-none focus:border-acid-lime/60" />
    </label>
  );
}

"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Copy, Link2, MapPin, Pencil, Plus, ShieldCheck, Star, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface CustomerDetail {
  id: number;
  full_name: string;
  phone: string;
  email: string | null;
  line_id: string | null;
  province: string;
  created_at: string;
}

interface Address {
  id: string;
  customer_id: number;
  recipient_name: string;
  phone: string;
  address: string;
  province: string;
  postal_code: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface CustomerIdentity {
  id: string;
  provider: string;
  provider_account_id: string;
  provider_user_id: string;
  status: "pending" | "verified" | "revoked";
  verified_at: string | null;
}

interface IdentityAudit {
  id: number;
  event_type: string;
  provider_user_id: string;
  failed_attempts: number;
  created_at: string;
}

interface LinkCodeResult {
  code: string;
  expires_at: string;
}

interface AddressForm {
  recipient_name: string;
  phone: string;
  address: string;
  province: string;
  postal_code: string;
  is_default: boolean;
}

const EMPTY_FORM: AddressForm = {
  recipient_name: "",
  phone: "",
  address: "",
  province: "",
  postal_code: "",
  is_default: false,
};

export default function AdminCustomerDetailPage() {
  const params = useParams<{ customerId: string }>();
  const customerId = params.customerId;
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [identities, setIdentities] = useState<CustomerIdentity[]>([]);
  const [identityAudit, setIdentityAudit] = useState<IdentityAudit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AddressForm>(EMPTY_FORM);
  const [providerUserId, setProviderUserId] = useState("");
  const [linkCode, setLinkCode] = useState<LinkCodeResult | null>(null);
  const [isCreatingCode, setIsCreatingCode] = useState(false);

  const loadCustomer = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/customers/${customerId}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "โหลดข้อมูลลูกค้าไม่สำเร็จ");
      setCustomer(result.customer);
      setAddresses(result.addresses ?? []);
      setIdentities(result.identities ?? []);
      setIdentityAudit(result.identity_audit ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "โหลดข้อมูลลูกค้าไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadCustomer();
  }, [loadCustomer]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      recipient_name: customer?.full_name ?? "",
      phone: customer?.phone ?? "",
      province: customer?.province ?? "",
      is_default: addresses.length === 0,
    });
    setShowForm(true);
    setError("");
  };

  const openEdit = (address: Address) => {
    setEditingId(address.id);
    setForm({
      recipient_name: address.recipient_name,
      phone: address.phone,
      address: address.address,
      province: address.province,
      postal_code: address.postal_code ?? "",
      is_default: address.is_default,
    });
    setShowForm(true);
    setError("");
  };

  const saveAddress = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      const endpoint = editingId
        ? `/api/admin/customers/${customerId}/addresses/${editingId}`
        : `/api/admin/customers/${customerId}/addresses`;
      const response = await fetch(endpoint, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "บันทึกที่อยู่ไม่สำเร็จ");
      setShowForm(false);
      setEditingId(null);
      await loadCustomer();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "บันทึกที่อยู่ไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteAddress = async (address: Address) => {
    if (!window.confirm(`ลบที่อยู่ของ ${address.recipient_name} ใช่หรือไม่?`)) return;
    setError("");
    try {
      const response = await fetch(
        `/api/admin/customers/${customerId}/addresses/${address.id}`,
        { method: "DELETE" },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "ลบที่อยู่ไม่สำเร็จ");
      await loadCustomer();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "ลบที่อยู่ไม่สำเร็จ");
    }
  };

  const createLinkCode = async (event: FormEvent) => {
    event.preventDefault();
    setIsCreatingCode(true);
    setError("");
    setLinkCode(null);
    try {
      const response = await fetch(`/api/admin/customers/${customerId}/line-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider_user_id: providerUserId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "สร้างรหัสยืนยันไม่สำเร็จ");
      setLinkCode({ code: result.code, expires_at: result.expires_at });
      await loadCustomer();
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : "สร้างรหัสยืนยันไม่สำเร็จ");
    } finally {
      setIsCreatingCode(false);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-white/50">กำลังโหลดข้อมูลลูกค้า...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <Link
        href="/admin/customers"
        className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        กลับหน้าลูกค้า
      </Link>

      {error && (
        <div role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {!customer ? (
        <Card className="border-white/10 bg-white/5">
          <CardContent className="py-12 text-center text-white/50">ไม่พบข้อมูลลูกค้า</CardContent>
        </Card>
      ) : (
        <>
          <div>
            <p className="text-xs uppercase tracking-widest text-acid-lime">Customer #{customer.id}</p>
            <h1 className="mt-1 text-3xl font-bold text-white">{customer.full_name}</h1>
            <p className="mt-2 text-sm text-white/60">
              {customer.phone} · {customer.email || "ไม่มีอีเมล"}
            </p>
          </div>

          <Card className="border-white/10 bg-white/5">
            <CardContent className="space-y-5 pt-6">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-acid-lime" />
                <div>
                  <h2 className="text-xl font-bold text-white">เชื่อมสมาชิกกับ LINE OA</h2>
                  <p className="mt-1 text-sm text-white/50">
                    สร้างรหัสใช้ครั้งเดียว แล้วโทรแจ้งรหัสไปยังเบอร์เดิม {customer.phone} เท่านั้น
                  </p>
                </div>
              </div>

              <form onSubmit={createLinkCode} className="flex flex-col gap-3 lg:flex-row">
                <label className="min-w-0 flex-1">
                  <span className="mb-1.5 block text-xs text-white/60">LINE user ID จาก webhook/inbox</span>
                  <input
                    required
                    value={providerUserId}
                    onChange={(event) => setProviderUserId(event.target.value)}
                    placeholder="U ตามด้วยอักขระ 32 ตัว"
                    autoComplete="off"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-acid-lime/60"
                  />
                </label>
                <button
                  disabled={isCreatingCode}
                  className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-acid-lime px-4 py-2 text-sm font-bold text-navy-deep disabled:opacity-50"
                >
                  <Link2 className="h-4 w-4" />
                  {isCreatingCode ? "กำลังสร้าง..." : "สร้างรหัส 10 นาที"}
                </button>
              </form>

              {linkCode && (
                <div role="status" className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-200">แสดงครั้งเดียว · ห้ามส่งในแชท</p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="font-mono text-3xl font-black tracking-[0.3em] text-white">{linkCode.code}</span>
                    <button
                      type="button"
                      aria-label="คัดลอกรหัสยืนยัน"
                      onClick={() => navigator.clipboard?.writeText(linkCode.code)}
                      className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-white/60">
                    หมดอายุ {new Date(linkCode.expires_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                    {" · "}โทรแจ้งเฉพาะเบอร์เดิมในระบบ แล้วให้ลูกค้าส่งรหัสนี้กลับมาทาง LINE
                  </p>
                </div>
              )}

              <div className="grid gap-3 lg:grid-cols-2">
                <div>
                  <h3 className="text-sm font-bold text-white">บัญชีที่เชื่อมแล้ว</h3>
                  {identities.length === 0 ? (
                    <p className="mt-2 text-sm text-white/40">ยังไม่มี LINE identity ที่ยืนยันแล้ว</p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {identities.map((identity) => (
                        <div key={identity.id} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/70">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-mono">{maskIdentity(identity.provider_user_id)}</span>
                            <span className={identity.status === "verified" ? "text-acid-lime" : "text-white/50"}>
                              {identity.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">เหตุการณ์ล่าสุด</h3>
                  {identityAudit.length === 0 ? (
                    <p className="mt-2 text-sm text-white/40">ยังไม่มีประวัติการยืนยัน</p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {identityAudit.slice(0, 5).map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60">
                          <span>{formatAuditEvent(entry.event_type)}{entry.failed_attempts ? ` (${entry.failed_attempts}/5)` : ""}</span>
                          <time>{new Date(entry.created_at).toLocaleString("th-TH")}</time>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">ที่อยู่จัดส่ง</h2>
              <p className="text-sm text-white/50">ข้อมูลนี้มองเห็นได้เฉพาะระบบหลังบ้าน</p>
            </div>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-acid-lime px-4 py-2 text-sm font-bold text-navy-deep hover:brightness-110"
            >
              <Plus className="h-4 w-4" />
              เพิ่มที่อยู่
            </button>
          </div>

          {showForm && (
            <Card className="border-acid-lime/30 bg-white/5">
              <CardContent className="pt-6">
                <form onSubmit={saveAddress} className="space-y-4">
                  <h3 className="font-bold text-white">{editingId ? "แก้ไขที่อยู่" : "เพิ่มที่อยู่"}</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <AddressInput label="ชื่อผู้รับ" value={form.recipient_name} onChange={(value) => setForm({ ...form, recipient_name: value })} />
                    <AddressInput label="เบอร์โทร" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
                    <div className="md:col-span-2">
                      <label className="mb-1.5 block text-xs text-white/60">ที่อยู่</label>
                      <textarea
                        required
                        value={form.address}
                        onChange={(event) => setForm({ ...form, address: event.target.value })}
                        rows={3}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-acid-lime/60"
                      />
                    </div>
                    <AddressInput label="จังหวัด" value={form.province} onChange={(value) => setForm({ ...form, province: value })} />
                    <AddressInput label="รหัสไปรษณีย์" value={form.postal_code} required={false} onChange={(value) => setForm({ ...form, postal_code: value })} />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-white/80">
                    <input
                      type="checkbox"
                      checked={form.is_default}
                      onChange={(event) => setForm({ ...form, is_default: event.target.checked })}
                      className="h-4 w-4 accent-lime-400"
                    />
                    ตั้งเป็นที่อยู่หลัก
                  </label>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/5">
                      ยกเลิก
                    </button>
                    <button disabled={isSaving} className="rounded-lg bg-acid-lime px-4 py-2 text-sm font-bold text-navy-deep disabled:opacity-50">
                      {isSaving ? "กำลังบันทึก..." : "บันทึก"}
                    </button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {addresses.length === 0 ? (
            <Card className="border-white/10 bg-white/5">
              <CardContent className="py-12 text-center text-white/50">ยังไม่มีที่อยู่จัดส่ง</CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {addresses.map((address) => (
                <Card key={address.id} className="border-white/10 bg-white/5">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 gap-3">
                        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-acid-lime" />
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-white">{address.recipient_name}</p>
                            {address.is_default && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-acid-lime/15 px-2 py-0.5 text-xs text-acid-lime">
                                <Star className="h-3 w-3" /> ที่อยู่หลัก
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-white/60">{address.phone}</p>
                          <p className="mt-3 text-sm leading-6 text-white/80">
                            {address.address} {address.province} {address.postal_code || ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button type="button" aria-label="แก้ไขที่อยู่" onClick={() => openEdit(address)} className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" aria-label="ลบที่อยู่" onClick={() => deleteAddress(address)} className="rounded-lg p-2 text-white/50 hover:bg-red-400/10 hover:text-red-300">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function maskIdentity(value: string): string {
  if (value.length <= 10) return "••••••";
  return `${value.slice(0, 5)}••••••${value.slice(-4)}`;
}

function formatAuditEvent(eventType: string): string {
  const labels: Record<string, string> = {
    created: "สร้างรหัส",
    superseded: "ยกเลิกรหัสเก่า",
    failed: "ยืนยันไม่ผ่าน",
    locked: "ล็อกชั่วคราว",
    expired: "รหัสหมดอายุ",
    verified: "ยืนยันสำเร็จ",
    identity_conflict: "ข้อมูลเชื่อมโยงขัดแย้ง",
  };
  return labels[eventType] ?? eventType;
}

function AddressInput({
  label,
  value,
  onChange,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-white/60">{label}</span>
      <input
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-acid-lime/60"
      />
    </label>
  );
}

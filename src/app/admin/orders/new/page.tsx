"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Customer { id: number; full_name: string; phone: string }
interface Address { id: string; recipient_name: string; phone: string; address: string; province: string; postal_code: string | null; is_default: boolean }
interface Identity { id: string; provider_user_id: string; status: string }
interface Variant { variantId: string; variantKey: string; sku: string; name: string; nameTh: string | null; stock: number }
interface Product { name: string; nameTh: string | null; price: number; salePrice: number | null; flavors: Variant[] }
interface Brand { name: string; nameTh: string | null; products: Product[] }
interface VariantOption extends Variant { label: string; price: number }
interface DraftItem { product_flavor_id: string; quantity: number }

export default function NewAdminOrderPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [addressId, setAddressId] = useState("");
  const [orderSource, setOrderSource] = useState<"admin_manual" | "line">("line");
  const [identityId, setIdentityId] = useState("");
  const [items, setItems] = useState<DraftItem[]>([{ product_flavor_id: "", quantity: 1 }]);
  const [adminNote, setAdminNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");

  useEffect(() => {
    setIdempotencyKey(globalThis.crypto.randomUUID());
    Promise.all([
      fetch("/api/admin/customers?page_size=100", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/admin/stock", { cache: "no-store" }).then((response) => response.json()),
    ]).then(([customerResult, stockResult]) => {
      if (!customerResult.success || !stockResult.success) throw new Error("โหลดข้อมูลเริ่มต้นไม่สำเร็จ");
      setCustomers(customerResult.customers ?? []);
      setBrands(stockResult.data ?? []);
    }).catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "โหลดข้อมูลเริ่มต้นไม่สำเร็จ");
    }).finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!customerId) {
      setAddresses([]); setIdentities([]); setAddressId(""); setIdentityId("");
      return;
    }
    fetch(`/api/admin/customers/${customerId}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "โหลดข้อมูลลูกค้าไม่สำเร็จ");
        const nextAddresses = (result.addresses ?? []) as Address[];
        const nextIdentities = ((result.identities ?? []) as Identity[]).filter((identity) => identity.status === "verified");
        setAddresses(nextAddresses); setIdentities(nextIdentities);
        setAddressId(nextAddresses.find((address) => address.is_default)?.id ?? nextAddresses[0]?.id ?? "");
        setIdentityId(nextIdentities[0]?.id ?? "");
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "โหลดข้อมูลลูกค้าไม่สำเร็จ"));
  }, [customerId]);

  const variants = useMemo<VariantOption[]>(() => brands.flatMap((brand) => brand.products.flatMap((product) => product.flavors.map((flavor) => ({
    ...flavor,
    label: `${brand.nameTh || brand.name} · ${product.nameTh || product.name} · ${flavor.nameTh || flavor.name} · ${flavor.sku}`,
    price: product.salePrice ?? product.price,
  })))), [brands]);

  const total = items.reduce((sum, item) => sum + (variants.find((option) => option.variantId === item.product_flavor_id)?.price ?? 0) * item.quantity, 0);
  const updateItem = (index: number, next: Partial<DraftItem>) => setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...next } : item));

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setIsSaving(true); setError("");
    try {
      const response = await fetch("/api/admin/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: Number(customerId), address_id: addressId, source_customer_identity_id: orderSource === "line" ? identityId : null, order_source: orderSource, idempotency_key: idempotencyKey, items, admin_note: adminNote }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "บันทึกรายการไม่สำเร็จ");
      router.push(`/admin/orders/${result.order_id}`); router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "บันทึกรายการไม่สำเร็จ");
    } finally { setIsSaving(false); }
  };

  return <div className="space-y-6 p-4 sm:p-6 lg:p-8">
    <Link href="/admin/orders" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"><ArrowLeft className="h-4 w-4" />กลับหน้าออเดอร์</Link>
    <div><h1 className="text-3xl font-bold text-white">รับรายการใหม่</h1><p className="mt-1 text-white/50">บันทึกรายการไว้ตรวจสอบก่อนยืนยันสต๊อก</p></div>
    {error && <div role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</div>}
    {isLoading ? <p className="text-white/50">กำลังโหลดข้อมูล...</p> : <form onSubmit={submit} className="space-y-5">
      <Card className="border-white/10 bg-white/5"><CardContent className="grid gap-4 pt-6 md:grid-cols-2">
        <SelectField label="ลูกค้า" value={customerId} onChange={setCustomerId} required><option value="">เลือกลูกค้า</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.full_name} · {customer.phone}</option>)}</SelectField>
        <SelectField label="ที่อยู่จัดส่ง" value={addressId} onChange={setAddressId} required><option value="">เลือกที่อยู่</option>{addresses.map((address) => <option key={address.id} value={address.id}>{address.recipient_name} · {address.address} {address.province}</option>)}</SelectField>
        <SelectField label="ช่องทาง" value={orderSource} onChange={(value) => setOrderSource(value as "admin_manual" | "line")} required><option value="line">LINE OA</option><option value="admin_manual">แอดมินกรอกเอง</option></SelectField>
        {orderSource === "line" && <SelectField label="LINE identity ที่ยืนยันแล้ว" value={identityId} onChange={setIdentityId} required><option value="">เลือกบัญชี LINE</option>{identities.map((identity) => <option key={identity.id} value={identity.id}>{maskIdentity(identity.provider_user_id)}</option>)}</SelectField>}
      </CardContent></Card>

      <Card className="border-white/10 bg-white/5"><CardContent className="space-y-4 pt-6">
        <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-white">สินค้า</h2><p className="text-sm text-white/50">ชื่อ SKU และราคาจะยืนยันจากฐานข้อมูลอีกครั้ง</p></div><button type="button" onClick={() => setItems((current) => [...current, { product_flavor_id: "", quantity: 1 }])} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white hover:bg-white/5"><Plus className="h-4 w-4" />เพิ่มรายการ</button></div>
        {items.map((item, index) => <div key={index} className="grid gap-3 rounded-xl border border-white/10 p-3 md:grid-cols-[1fr_150px_44px]">
          <SelectField label={`สินค้า ${index + 1}`} value={item.product_flavor_id} onChange={(value) => updateItem(index, { product_flavor_id: value })} required><option value="">เลือก SKU</option>{variants.map((variant) => <option key={variant.variantId} value={variant.variantId}>{variant.label} · ฿{variant.price} · คงเหลือ {variant.stock}</option>)}</SelectField>
          <label><span className="mb-1.5 block text-xs text-white/60">จำนวน</span><div className="flex"><button type="button" aria-label="ลดจำนวน" onClick={() => updateItem(index, { quantity: Math.max(1, item.quantity - 1) })} className="rounded-l-lg border border-white/10 px-2 text-white"><Minus className="h-4 w-4" /></button><input required type="number" min={1} max={999} value={item.quantity} onChange={(event) => updateItem(index, { quantity: Math.max(1, Number(event.target.value) || 1) })} className="min-w-0 flex-1 border-y border-white/10 bg-white/5 px-2 py-2 text-center text-sm text-white outline-none" /><button type="button" aria-label="เพิ่มจำนวน" onClick={() => updateItem(index, { quantity: Math.min(999, item.quantity + 1) })} className="rounded-r-lg border border-white/10 px-2 text-white"><Plus className="h-4 w-4" /></button></div></label>
          <button type="button" aria-label={`ลบสินค้ารายการที่ ${index + 1}`} disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="mt-auto rounded-lg p-2.5 text-white/50 hover:bg-red-400/10 hover:text-red-300 disabled:opacity-20"><Trash2 className="h-4 w-4" /></button>
        </div>)}
      </CardContent></Card>

      <Card className="border-white/10 bg-white/5"><CardContent className="space-y-4 pt-6"><label><span className="mb-1.5 block text-xs text-white/60">หมายเหตุภายใน (ไม่เก็บข้อความแชททั้งชุด)</span><textarea value={adminNote} onChange={(event) => setAdminNote(event.target.value)} maxLength={1000} rows={3} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-acid-lime/60" /></label><div className="flex flex-col items-end gap-3"><p className="text-lg font-bold text-white">ยอดประมาณการ ฿{total.toLocaleString()}</p><button disabled={isSaving || !idempotencyKey} className="inline-flex items-center gap-2 rounded-lg bg-acid-lime px-5 py-3 font-bold text-navy-deep disabled:opacity-50"><ShoppingCart className="h-4 w-4" />{isSaving ? "กำลังบันทึก..." : "บันทึกรายการ"}</button><p className="text-xs text-amber-200">ระบบจะรอการตรวจสอบและยืนยันสต๊อกก่อนส่งข้อมูลชำระเงิน</p></div></CardContent></Card>
    </form>}
  </div>;
}

function SelectField({ label, value, onChange, required, children }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; children: React.ReactNode }) {
  return <label className="min-w-0"><span className="mb-1.5 block text-xs text-white/60">{label}</span><select required={required} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-white/10 bg-brand-void px-3 py-2 text-sm text-white outline-none focus:border-acid-lime/60">{children}</select></label>;
}

function maskIdentity(value: string): string { return value.length > 10 ? `${value.slice(0, 5)}••••••${value.slice(-4)}` : "••••••"; }

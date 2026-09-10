"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle, ClipboardCheck, Loader2, PackageCheck, Send, Truck, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { AdminPermission } from "@/lib/admin-permissions";

interface OrderItem {
  id: string;
  brand_name: string;
  product_name: string;
  flavor_name: string;
  sku: string;
  quantity: number;
  unit_price: number | string;
  total_price: number | string;
}

interface Reservation {
  id: string;
  status: "reserved" | "confirmed" | "released" | "expired";
  expires_at: string;
}

interface Order {
  order_number: string;
  order_source: string;
  status: string;
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
  shipping_province: string;
  shipping_postal_code: string | null;
  subtotal: number | string;
  shipping_fee: number | string;
  discount_amount: number | string;
  discount_credit_id: string | null;
  total: number | string;
  admin_note: string | null;
  carrier: string | null;
  tracking_number: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  created_at: string;
}

interface PaymentRequest {
  status: "awaiting_slip" | "verified" | "failed" | "expired" | "cancelled";
  expected_amount: number | string;
  expires_at: string;
  failure_code: string | null;
  verified_at: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "รอยืนยันสต๊อก",
  pending: "จองแล้ว / รอตรวจการชำระเงิน",
  confirmed: "ยืนยันแล้ว",
  shipped: "จัดส่งแล้ว",
  delivered: "สำเร็จ",
  cancelled: "ยกเลิก",
};

const CARRIER_OPTIONS = ["Flash Express", "ไปรษณีย์ไทย / EMS", "KEX Express", "J&T Express", "BEST Express", "Ninja Van"];

export default function AdminOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [payment, setPayment] = useState<PaymentRequest | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isReserving, setIsReserving] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);

  const loadOrder = useCallback(async () => {
    const response = await fetch(`/api/admin/orders/${orderId}`, {
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "โหลดออเดอร์ไม่สำเร็จ");
    setOrder(result.order);
    setItems(result.items ?? []);
    setReservations(result.reservations ?? []);
    setPayment(result.payment ?? null);
  }, [orderId]);

  useEffect(() => {
    loadOrder().catch((reason) => {
      setError(reason instanceof Error ? reason.message : "โหลดออเดอร์ไม่สำเร็จ");
    });
  }, [loadOrder]);

  useEffect(() => {
    fetch("/api/admin/auth", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => setPermissions(result?.session?.permissions ?? []))
      .catch(() => setPermissions([]));
  }, []);

  async function reserveOrder() {
    setIsReserving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/reserve`, {
        method: "POST",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "จองสต็อกไม่สำเร็จ");
      setSuccess(result.message || "จองสต็อกสำเร็จ");
      await loadOrder();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "จองสต็อกไม่สำเร็จ");
    } finally {
      setIsReserving(false);
    }
  }

  async function approveLineOrder() {
    setIsReserving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/approve-payment`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "ยืนยันสต๊อกและส่งข้อมูลชำระเงินไม่สำเร็จ");
      setSuccess(result.message || "ยืนยันสต๊อกและส่งข้อมูลชำระเงินเข้า LINE แล้ว");
      await loadOrder();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "ยืนยันสต๊อกและส่งข้อมูลชำระเงินไม่สำเร็จ");
      await loadOrder().catch(() => undefined);
    } finally {
      setIsReserving(false);
    }
  }

  async function confirmOrder() {
    setIsConfirming(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/confirm`, {
        method: "POST",
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.reservationExpired) await loadOrder();
        throw new Error(result.error || "ยืนยันออเดอร์ไม่สำเร็จ");
      }
      setSuccess(result.message || "ยืนยันออเดอร์สำเร็จ");
      await loadOrder();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "ยืนยันออเดอร์ไม่สำเร็จ");
    } finally {
      setIsConfirming(false);
    }
  }

  async function updateStatus(action: "cancel" | "ship" | "deliver") {
    if (action === "cancel" && !window.confirm("ยืนยันยกเลิกออเดอร์นี้? หากตัดสต็อกแล้วระบบจะคืนให้อัตโนมัติ")) return;
    setIsUpdatingStatus(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, carrier, trackingNumber }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "เปลี่ยนสถานะไม่สำเร็จ");
      setSuccess(result.message || "เปลี่ยนสถานะสำเร็จ");
      await loadOrder();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "เปลี่ยนสถานะไม่สำเร็จ");
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  const can = (permission: AdminPermission) => permissions.includes(permission);

  const activeReservation = reservations.find(
    (reservation) => reservation.status === "reserved",
  );

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />กลับหน้าออเดอร์
      </Link>

      {error && (
        <div role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-red-200">
          {error}
        </div>
      )}
      {success && (
        <div role="status" className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-4 text-emerald-100">
          {success}
        </div>
      )}

      {!order && !error ? (
        <p className="text-white/50">กำลังโหลดออเดอร์...</p>
      ) : order && (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-acid-lime">
                {STATUS_LABELS[order.status] ?? order.status}
              </p>
              <h1 className="mt-1 font-mono text-3xl font-black text-white">
                {order.order_number}
              </h1>
              <p className="mt-2 text-sm text-white/50">
                {new Date(order.created_at).toLocaleString("th-TH")} · {order.order_source === "line" ? "LINE OA" : "แอดมิน"}
              </p>
            </div>

            <div className="flex flex-wrap items-end justify-end gap-3">
            {order.status === "draft" && order.order_source === "line" && can("orders.reserve") && can("orders.confirm") && (
              <button
                type="button"
                onClick={approveLineOrder}
                disabled={isReserving}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-acid-lime px-5 py-3 font-black text-navy-deep disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isReserving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                {isReserving ? "กำลังยืนยัน..." : "ยืนยันสต๊อกและส่งข้อมูลชำระเงินเข้า LINE"}
              </button>
            )}
            {order.status === "draft" && order.order_source !== "line" && can("orders.reserve") && (
              <button
                type="button"
                onClick={reserveOrder}
                disabled={isReserving}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-acid-lime px-5 py-3 font-bold text-navy-deep disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isReserving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                {isReserving ? "กำลังตรวจสต็อก..." : "ตรวจและจองสต็อก"}
              </button>
            )}
            {order.status === "pending" && order.order_source !== "line" && can("orders.confirm") && (
              <button
                type="button"
                onClick={confirmOrder}
                disabled={isConfirming}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-400 px-5 py-3 font-bold text-navy-deep disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isConfirming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                {isConfirming ? "กำลังยืนยัน..." : "ยืนยันและตัดสต็อก"}
              </button>
            )}
            {(["draft", "pending", "confirmed"].includes(order.status)) && can("orders.cancel") && (
              <button
                type="button"
                onClick={() => updateStatus("cancel")}
                disabled={isUpdatingStatus}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-400/40 px-5 py-3 font-bold text-red-300 hover:bg-red-400/10 disabled:opacity-50"
              >
                {isUpdatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                ยกเลิกออเดอร์
              </button>
            )}
            </div>
          </div>

          {order.status === "confirmed" && can("orders.ship") && (
            <Card className="overflow-hidden border-acid-lime/25 bg-gradient-to-br from-acid-lime/10 to-sky-300/[0.06]">
              <CardContent className="py-5 sm:py-6">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-acid-lime text-navy-deep"><Truck className="h-6 w-6" /></span>
                  <div><p className="text-xs font-black text-acid-lime">ขั้นตอนถัดไป</p><h2 className="mt-1 text-xl font-black text-white">ใส่เลขพัสดุและแจ้งลูกค้า</h2><p className="mt-1 text-sm text-white/55">เมื่อบันทึกแล้ว หน้า member จะเปลี่ยนเป็น “จัดส่งแล้ว” และระบบจะแจ้งลูกค้าทาง LINE หนึ่งครั้ง</p></div>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-bold text-white">
                    1. เลือกบริษัทขนส่ง
                    <select value={carrier} onChange={(event) => setCarrier(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-navy-deep px-4 py-3 text-white outline-none focus:border-acid-lime">
                      <option value="">เลือกบริษัทขนส่ง</option>
                      {CARRIER_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </label>
                  <label className="text-sm font-bold text-white">
                    2. กรอกเลขพัสดุ
                    <input value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} placeholder="เช่น TH0123456789" autoCapitalize="characters" className="mt-2 w-full rounded-xl border border-white/15 bg-navy-deep px-4 py-3 font-mono text-lg uppercase text-white outline-none focus:border-acid-lime" />
                  </label>
                </div>
                <div className="mt-5 flex flex-col gap-3 rounded-xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-2 text-sm text-white/65"><ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /><span>ตรวจเลขให้ถูกต้องก่อนบันทึก ระบบจะเปลี่ยนสถานะออเดอร์ทันที</span></div>
                  <button type="button" onClick={() => updateStatus("ship")} disabled={isUpdatingStatus || !carrier.trim() || !trackingNumber.trim()} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-acid-lime px-5 font-black text-navy-deep disabled:cursor-not-allowed disabled:opacity-40">
                    {isUpdatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {isUpdatingStatus ? "กำลังบันทึก..." : "บันทึกและแจ้งลูกค้า"}
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {order.status === "shipped" && (
            <Card className="border-emerald-300/20 bg-emerald-300/10">
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-emerald-100">
                  <p className="font-black">จัดส่งแล้ว · {order.carrier}</p>
                  <p className="mt-2 break-all font-mono text-xl font-black text-white">{order.tracking_number}</p>
                  {order.shipped_at && <p className="mt-1 text-white/50">ส่งเมื่อ {new Date(order.shipped_at).toLocaleString("th-TH")}</p>}
                </div>
                {can("orders.ship") && (
                  <button
                    type="button"
                    onClick={() => updateStatus("deliver")}
                    disabled={isUpdatingStatus}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-400 px-5 py-2.5 font-bold text-navy-deep disabled:opacity-50"
                  >
                    {isUpdatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
                    ยืนยันส่งถึงลูกค้า
                  </button>
                )}
              </CardContent>
            </Card>
          )}

          {order.status === "draft" ? (
            <Card className="border-amber-300/20 bg-amber-300/10">
              <CardContent className="py-4 text-sm text-amber-100">
                รายการนี้ยังไม่ได้ยืนยัน กรุณาตรวจสินค้า ราคา และที่อยู่ก่อนกดยืนยันสต๊อก
              </CardContent>
            </Card>
          ) : order.status === "pending" && activeReservation ? (
            <Card className="border-sky-300/20 bg-sky-300/10">
              <CardContent className="py-4 text-sm text-sky-100">
                จองสินค้าไว้ถึง {new Date(activeReservation.expires_at).toLocaleString("th-TH")} และกำลังรอลูกค้าส่งหลักฐานการชำระเงิน ระบบจะยกเลิกอัตโนมัติเมื่อหมดเวลา ไม่ต้องส่งข้อความเตือนซ้ำ
              </CardContent>
            </Card>
          ) : order.status === "confirmed" ? (
            <Card className="border-emerald-300/20 bg-emerald-300/10">
              <CardContent className="py-4 text-sm text-emerald-100">
                ยืนยันออเดอร์แล้ว สต็อกจริงถูกตัดและมีรายการใน stock ledger เรียบร้อย
              </CardContent>
            </Card>
          ) : null}

          {payment && (
            <Card className="border-violet-300/20 bg-violet-300/10">
              <CardContent className="py-4 text-sm text-violet-100">
                <p className="font-bold">การชำระเงิน: {payment.status === "awaiting_slip" ? "รอหลักฐานการชำระเงิน" : payment.status === "verified" ? "ตรวจสอบเรียบร้อยแล้ว" : "ไม่อยู่ในช่วงรับหลักฐานการชำระเงิน"}</p>
                <p className="mt-1">ยอด ฿{Number(payment.expected_amount).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</p>
                {payment.status === "awaiting_slip" && <p className="mt-1 text-white/60">รับสลิปถึง {new Date(payment.expires_at).toLocaleString("th-TH")}</p>}
                {payment.failure_code && payment.status === "awaiting_slip" && <p className="mt-1 text-amber-200">ครั้งล่าสุดยังไม่ผ่าน: {payment.failure_code}</p>}
              </CardContent>
            </Card>
          )}

          <Card className="border-white/10 bg-white/5">
            <CardContent className="pt-6">
              <h2 className="font-bold text-white">จัดส่งถึง {order.shipping_name}</h2>
              <p className="mt-1 text-sm text-white/60">{order.shipping_phone}</p>
              <p className="mt-3 text-sm text-white/80">
                {order.shipping_address} {order.shipping_province} {order.shipping_postal_code || ""}
              </p>
              {order.admin_note && (
                <p className="mt-4 rounded-lg bg-white/5 p-3 text-sm text-white/60">
                  {order.admin_note}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-white/10 bg-white/5">
            <CardContent className="p-0">
              <div className="divide-y divide-white/5">
                {items.map((item) => (
                  <div key={item.id} className="grid gap-2 px-4 py-4 text-sm md:grid-cols-[1fr_100px_120px]">
                    <div>
                      <p className="font-bold text-white">
                        {item.brand_name} · {item.product_name} · {item.flavor_name}
                      </p>
                      <p className="mt-1 font-mono text-xs text-white/40">SKU {item.sku}</p>
                    </div>
                    <p className="text-white/60">
                      {item.quantity} × ฿{Number(item.unit_price).toLocaleString()}
                    </p>
                    <p className="text-right font-bold text-white">
                      ฿{Number(item.total_price).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
              <div className="space-y-2 border-t border-white/10 px-4 py-4 text-sm text-white/60">
                <div className="flex justify-between">
                  <span>ยอดสินค้า</span>
                  <span>฿{Number(order.subtotal).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>ค่าจัดส่ง</span>
                  <span>{Number(order.shipping_fee) === 0 ? "ส่งฟรี" : `฿${Number(order.shipping_fee).toLocaleString()}`}</span>
                </div>
                {Number(order.discount_amount) > 0 && (
                  <div className="flex justify-between font-bold text-acid-lime">
                    <span>ส่วนลดจากรีวิว</span>
                    <span>−฿{Number(order.discount_amount).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-white/10 pt-3 text-lg font-black text-white">
                  <span>รวมทั้งหมด</span>
                  <span>฿{Number(order.total).toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle, Loader2, Truck, Upload, XCircle } from "lucide-react";
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
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  created_at: string;
}

interface PaymentRequest {
  status: "awaiting_slip" | "verified" | "failed" | "expired" | "cancelled";
  expected_amount: number | string;
  expires_at: string;
  failure_code: string | null;
  verified_at: string | null;
  verification_method: "thunder" | "manual_bank";
  provider_transaction_ref: string | null;
  manual_verified_by: string | null;
  manual_verification_note: string | null;
  manual_slip_path: string | null;
  line_message_id: string | null;
}

interface PaymentAlert {
  status: "pending" | "sending" | "sent" | "failed";
  attempt_count: number;
  last_error: string | null;
  sent_at: string | null;
}

type FulfillmentStatus = "ready_to_pack" | "packing" | "packed" | "problem" | "shipped";
interface Fulfillment {
  status: FulfillmentStatus;
  assigned_to: string | null;
  problem_note: string | null;
  started_at: string | null;
  packed_at: string | null;
  shipped_at: string | null;
}

const FULFILLMENT_LABELS: Record<FulfillmentStatus, string> = {
  ready_to_pack: "รอรับงานแพ็ก", packing: "กำลังแพ็ก", packed: "แพ็กเสร็จ · รอส่งมอบ",
  problem: "มีปัญหา", shipped: "จัดส่งแล้ว",
};
const PROBLEMS = [
  ["item_missing", "สินค้าไม่พบ"], ["quantity_mismatch", "จำนวนสินค้าไม่ตรง"], ["damaged", "สินค้าชำรุด"],
  ["address_unclear", "ที่อยู่ไม่ชัดเจน"], ["shipping_unavailable", "ไม่สามารถจัดส่งได้"], ["other", "อื่น ๆ"],
];

const PROVIDER_FAILURE_CODES = new Set([
  "API_SERVER_ERROR", "BRANCH_INACTIVE", "INTERNAL_SERVER_ERROR", "INVALID_API_KEY",
  "IP_NOT_ALLOWED", "MISSING_API_KEY", "QUOTA_EXCEEDED",
  "RENEWAL_TEMPORARILY_UNAVAILABLE", "SERVICE_EXPIRED",
]);

const STATUS_LABELS: Record<string, string> = {
  draft: "รอยืนยันสต๊อก",
  pending: "จองแล้ว / รอตรวจการชำระเงิน",
  confirmed: "ชำระแล้ว · ส่งเข้าคลังแล้ว",
  shipped: "จัดส่งแล้ว",
  delivered: "สำเร็จ",
  cancelled: "ยกเลิก",
};

export default function AdminOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [payment, setPayment] = useState<PaymentRequest | null>(null);
  const [paymentAlert, setPaymentAlert] = useState<PaymentAlert | null>(null);
  const [fulfillment, setFulfillment] = useState<Fulfillment | null>(null);
  const [problemCode, setProblemCode] = useState("item_missing");
  const [problemNote, setProblemNote] = useState("");
  const [showProblem, setShowProblem] = useState(false);
  const [sendingPaymentAlert, setSendingPaymentAlert] = useState(false);
  const [manualNote, setManualNote] = useState("");
  const [manualBankConfirmed, setManualBankConfirmed] = useState(false);
  const [manualSlip, setManualSlip] = useState<File | null>(null);
  const [manualSlipPreview, setManualSlipPreview] = useState<string | null>(null);
  const [isDraggingSlip, setIsDraggingSlip] = useState(false);
  const [isManuallyVerifying, setIsManuallyVerifying] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isReserving, setIsReserving] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);

  useEffect(() => {
    if (!manualSlip) {
      setManualSlipPreview(null);
      return;
    }
    const url = URL.createObjectURL(manualSlip);
    setManualSlipPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [manualSlip]);

  function chooseManualSlip(file: File | null) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 4 * 1024 * 1024 || file.size === 0) {
      setError("สลิปต้องเป็น JPG, PNG หรือ WebP และมีขนาดไม่เกิน 4 MB");
      return;
    }
    setError("");
    setManualSlip(file);
  }

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
    setPaymentAlert(result.paymentAlert ?? null);
    setFulfillment(result.fulfillment ?? null);
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

  async function cancelCurrentOrder() {
    if (!window.confirm("ยืนยันยกเลิกออเดอร์นี้? หากตัดสต็อกแล้วระบบจะคืนให้อัตโนมัติ")) return;
    setIsUpdatingStatus(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
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

  async function updateFulfillment(action: "start" | "pack" | "problem" | "resume" | "ship") {
    if (action === "ship" && !window.confirm("ยืนยันว่ามอบสินค้าให้ผู้จัดส่งแล้วใช่ไหมคะ? หน้าสมาชิกจะเปลี่ยนเป็น ‘จัดส่งแล้ว’ และระบบจะไม่ส่งข้อความ LINE เพิ่ม")) return;
    setIsUpdatingStatus(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/fulfillment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, problemCode, problemNote }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "อัปเดตสถานะไม่สำเร็จ");
      setSuccess(result.message || "อัปเดตสถานะสำเร็จ");
      setShowProblem(false);
      await loadOrder();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "อัปเดตสถานะไม่สำเร็จ");
      await loadOrder().catch(() => undefined);
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  async function sendPaymentAlert() {
    setSendingPaymentAlert(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/payment-alert`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "ส่งแจ้งเตือน Telegram ไม่สำเร็จ");
      setSuccess(result.message);
      await loadOrder();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "ส่งแจ้งเตือน Telegram ไม่สำเร็จ");
      await loadOrder().catch(() => undefined);
    } finally {
      setSendingPaymentAlert(false);
    }
  }

  async function verifyManualBankPayment() {
    if (!order || !payment) return;
    if (manualNote.trim().length < 10) {
      setError("กรุณาบันทึกวิธีตรวจยอดและหลักฐานอย่างน้อย 10 ตัวอักษร");
      return;
    }
    if (!manualBankConfirmed) {
      setError("กรุณาตรวจรายการเงินเข้าในบัญชีธนาคารจริง แล้วติ๊กช่องยืนยันก่อนดำเนินการ");
      return;
    }
    const recoveryMode = (order.status === "cancelled" && payment.status === "expired")
      || (order.status === "pending" && payment.status === "failed");
    if (!window.confirm(`ยืนยันว่าเห็นเงินเข้าบัญชีร้านจริง ฿${Number(payment.expected_amount).toFixed(2)} สำหรับออเดอร์ ${order.order_number}? ${recoveryMode ? "ระบบจะตรวจสต็อกใหม่และกู้ออเดอร์เดิม" : "ระบบจะยืนยันออเดอร์"} แล้วส่งงานเข้าคลังทันที`)) return;
    setIsManuallyVerifying(true);
    setError("");
    setSuccess("");
    try {
      const form = new FormData();
      form.set("amount", String(payment.expected_amount));
      form.set("note", manualNote);
      form.set("bankDepositConfirmed", String(manualBankConfirmed));
      form.set("recoveryMode", String(recoveryMode));
      if (manualSlip) form.set("slip", manualSlip);
      const response = await fetch(`/api/admin/orders/${orderId}/manual-payment`, {
        method: "POST",
        body: form,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "ยืนยันการชำระเงินไม่สำเร็จ");
      setSuccess(result.message);
      setManualSlip(null);
      await loadOrder();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "ยืนยันการชำระเงินไม่สำเร็จ");
      await loadOrder().catch(() => undefined);
    } finally {
      setIsManuallyVerifying(false);
    }
  }

  const can = (permission: AdminPermission) => permissions.includes(permission);

  const activeReservation = reservations.find(
    (reservation) => reservation.status === "reserved",
  );
  const activeProviderFailure = Boolean(payment?.status === "awaiting_slip" && payment.failure_code
    && PROVIDER_FAILURE_CODES.has(payment.failure_code) && payment.line_message_id);
  const recoveryMode = Boolean(payment?.line_message_id && order && (
    (order.status === "pending" && payment.status === "failed"
      && payment.failure_code && PROVIDER_FAILURE_CODES.has(payment.failure_code))
    || (order.status === "cancelled" && order.cancelled_by === "system:payment-timeout"
      && payment.status === "expired" && payment.failure_code === "PAYMENT_WINDOW_EXPIRED")
  ));
  const needsBankReview = activeProviderFailure || recoveryMode;

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
                onClick={cancelCurrentOrder}
                disabled={isUpdatingStatus}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-400/40 px-5 py-3 font-bold text-red-300 hover:bg-red-400/10 disabled:opacity-50"
              >
                {isUpdatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                ยกเลิกออเดอร์
              </button>
            )}
            </div>
          </div>

          {order.status === "confirmed" && (
            <Card className="overflow-hidden border-acid-lime/25 bg-gradient-to-br from-acid-lime/10 to-sky-300/[0.06]">
              <CardContent className="py-5 sm:py-6">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-acid-lime text-navy-deep"><Truck className="h-6 w-6" /></span>
                  <div><p className="text-xs font-black text-acid-lime">ส่งงานเข้าคลังอัตโนมัติแล้ว</p><h2 className="mt-1 text-xl font-black text-white">สถานะการแพ็กและจัดส่ง</h2><p className="mt-1 text-sm text-white/55">แอดมินและคลังอัปเดตงานชุดเดียวกันได้ ไม่ต้องยืนยันออเดอร์หรือการชำระเงินซ้ำค่ะ</p></div>
                </div>
                <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
                  {fulfillment ? <>
                    <p className="font-black text-white">{FULFILLMENT_LABELS[fulfillment.status]}</p>
                    {fulfillment.assigned_to && <p className="mt-1 text-xs text-white/50">ผู้รับงาน: {fulfillment.assigned_to}</p>}
                    {fulfillment.status === "problem" && fulfillment.problem_note && <p className="mt-2 text-sm text-red-200">ปัญหา: {fulfillment.problem_note}</p>}
                    {can("orders.ship") && <div className="mt-4 flex flex-wrap gap-2">
                      {fulfillment.status === "ready_to_pack" && <button type="button" disabled={isUpdatingStatus} onClick={() => void updateFulfillment("start")} className="rounded-xl bg-acid-lime px-4 py-3 font-black text-navy-deep disabled:opacity-40">รับงานและเริ่มแพ็ก</button>}
                      {fulfillment.status === "packing" && <button type="button" disabled={isUpdatingStatus} onClick={() => void updateFulfillment("pack")} className="rounded-xl bg-acid-lime px-4 py-3 font-black text-navy-deep disabled:opacity-40">ยืนยันว่าแพ็กเสร็จแล้ว</button>}
                      {fulfillment.status === "packed" && <button type="button" disabled={isUpdatingStatus} onClick={() => void updateFulfillment("ship")} className="rounded-xl bg-acid-lime px-4 py-3 font-black text-navy-deep disabled:opacity-40">ยืนยันว่าจัดส่งแล้ว</button>}
                      {fulfillment.status === "problem" && <button type="button" disabled={isUpdatingStatus} onClick={() => void updateFulfillment("resume")} className="rounded-xl border border-acid-lime/50 px-4 py-3 font-black text-acid-lime disabled:opacity-40">แก้ไขแล้ว · กลับเข้าคิว</button>}
                      {!["problem", "shipped"].includes(fulfillment.status) && <button type="button" disabled={isUpdatingStatus} onClick={() => setShowProblem((current) => !current)} className="rounded-xl border border-red-300/40 px-4 py-3 font-bold text-red-200 disabled:opacity-40">แจ้งปัญหา</button>}
                    </div>}
                    {showProblem && can("orders.ship") && !["problem", "shipped"].includes(fulfillment.status) && <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                      <select value={problemCode} onChange={(event) => setProblemCode(event.target.value)} className="w-full rounded-lg border border-white/20 bg-navy-deep p-3 text-white">{PROBLEMS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                      <textarea value={problemNote} onChange={(event) => setProblemNote(event.target.value)} maxLength={500} rows={2} placeholder="ระบุรายละเอียดปัญหา" className="w-full rounded-lg border border-white/20 bg-navy-deep p-3 text-white" />
                      <button type="button" disabled={isUpdatingStatus || !problemNote.trim()} onClick={() => void updateFulfillment("problem")} className="rounded-xl bg-red-300 px-4 py-3 font-black text-navy-deep disabled:opacity-40">บันทึกปัญหา</button>
                    </div>}
                    {fulfillment.status === "packed" && <p className="mt-3 text-xs text-white/55">กดยืนยันจัดส่งหลังมอบสินค้าให้ผู้จัดส่งจริงเท่านั้น สถานะหน้าสมาชิกจะเปลี่ยนทันทีโดยไม่ส่ง LINE เพิ่ม</p>}
                  </> : <p className="text-sm text-amber-200">ยังไม่พบงานคลัง กรุณาโหลดหน้าใหม่ก่อนอัปเดตสถานะ</p>}
                </div>
              </CardContent>
            </Card>
          )}

          {order.status === "shipped" && (
            <Card className="border-emerald-300/20 bg-emerald-300/10">
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-emerald-100">
                  <p className="font-black">จัดส่งแล้ว</p>
                  <p className="mt-1 text-white/70">ลูกค้าจะได้รับสินค้าภายในไม่เกิน 2 วันหลังจัดส่งค่ะ</p>
                  {order.shipped_at && <p className="mt-1 text-white/50">ส่งเมื่อ {new Date(order.shipped_at).toLocaleString("th-TH")}</p>}
                </div>
                <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1.5 text-xs font-black text-emerald-100">อัปเดตจากงานจัดส่ง</span>
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
                จองสินค้าไว้ถึง {new Date(activeReservation.expires_at).toLocaleString("th-TH")} {activeProviderFailure ? "· ได้รับสลิปแล้ว แต่ระบบตรวจอัตโนมัติขัดข้อง เมื่อหมดเวลาระบบจะพักไว้ให้แอดมินตรวจยอดและคืนสต็อกชั่วคราว ไม่ยกเลิกว่าไม่จ่าย" : "และกำลังรอลูกค้าส่งหลักฐานการชำระเงิน ระบบจะยกเลิกอัตโนมัติหากไม่มีสลิป"}
              </CardContent>
            </Card>
          ) : order.status === "confirmed" ? (
            <Card className="border-emerald-300/20 bg-emerald-300/10">
              <CardContent className="py-4 text-sm text-emerald-100">
                ชำระเงินเรียบร้อย สต็อกถูกตัด และส่งงานเข้าคลังอัตโนมัติแล้ว กรุณาอัปเดตงานแพ็กและจัดส่งตามความคืบหน้าจริงค่ะ
              </CardContent>
            </Card>
          ) : null}

          {payment && (
            <Card className="border-violet-300/20 bg-violet-300/10">
              <CardContent className="py-4 text-sm text-violet-100">
                <p className="font-bold">การชำระเงิน: {needsBankReview ? "ได้รับสลิปแล้ว · ต้องตรวจยอดธนาคาร" : payment.status === "awaiting_slip" ? "รอหลักฐานการชำระเงิน" : payment.status === "verified" ? "ตรวจสอบเรียบร้อยแล้ว" : "ไม่อยู่ในช่วงรับหลักฐานการชำระเงิน"}</p>
                {payment.status === "verified" && <p className="mt-1 text-xs text-white/70">ยืนยันโดย: {payment.verification_method === "manual_bank" ? "แอดมินตรวจยอดธนาคารด้วยตนเอง" : "Thunder ตรวจสลิป"}</p>}
                {payment.status === "verified" && payment.verification_method === "manual_bank" && (
                  <p className="mt-1 text-xs text-white/60">ผู้ยืนยัน: {payment.manual_verified_by} · {payment.provider_transaction_ref?.startsWith("MANUAL-ORDER-") ? "เลขติดตามภายใน" : "อ้างอิงธนาคาร"}: {payment.provider_transaction_ref}<br />บันทึก: {payment.manual_verification_note}</p>
                )}
                {payment.manual_slip_path && <a href={`/api/admin/orders/${orderId}/manual-payment/slip`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs font-bold text-acid-lime underline">เปิดสลิปที่แอดมินแนบไว้</a>}
                <p className="mt-1">ยอด ฿{Number(payment.expected_amount).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</p>
                {payment.status === "awaiting_slip" && <p className="mt-1 text-white/60">รับสลิปถึง {new Date(payment.expires_at).toLocaleString("th-TH")}</p>}
                {payment.failure_code && payment.status === "awaiting_slip" && <p className="mt-1 text-amber-200">ครั้งล่าสุดยังไม่ผ่าน: {payment.failure_code}</p>}
                {needsBankReview && (
                  <div className="mt-4 rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-amber-100">
                    <p className="font-bold">{recoveryMode ? "ออเดอร์รอตรวจเงิน · กู้เลขเดิมได้หลังตรวจยอด" : "ระบบตรวจสลิปขัดข้อง · ต้องตรวจยอดจากบัญชีธนาคาร"}</p>
                    <p className="mt-1 text-xs">ยังไม่ยืนยันการชำระเงินและยังไม่ส่งงานให้คลังแพ็ก {recoveryMode && "ระบบจะตรวจสต็อกอีกครั้งก่อนกู้รายการ"}</p>
                    <p className="mt-2 text-xs">
                      แจ้ง Telegram: {paymentAlert?.status === "sent"
                        ? `ส่งแล้ว ${new Date(paymentAlert.sent_at || "").toLocaleString("th-TH")}`
                        : paymentAlert?.status === "failed"
                          ? `ส่งไม่สำเร็จ (${paymentAlert.last_error || "ไม่ทราบสาเหตุ"})`
                          : paymentAlert?.status === "sending"
                            ? "กำลังส่ง"
                            : "ยังไม่ได้ส่ง"}
                    </p>
                    {can("orders.confirm") && (
                      <button type="button" onClick={sendPaymentAlert} disabled={sendingPaymentAlert}
                        className="mt-3 rounded-lg border border-amber-200/40 px-4 py-2 text-sm font-bold text-amber-100 disabled:opacity-50">
                        {sendingPaymentAlert ? "กำลังส่ง..." : paymentAlert?.status === "sent" ? "ส่งแจ้งเตือน Telegram ซ้ำ" : "แจ้ง Telegram ให้ตรวจยอดทันที"}
                      </button>
                    )}
                    {can("payments.manual_verify") && (recoveryMode || (order.status === "pending" && new Date(payment.expires_at).getTime() > Date.now())) && (
                      <div className="mt-5 space-y-3 border-t border-amber-200/20 pt-4">
                        <div>
                          <p className="font-bold">ยืนยันเงินเข้าบัญชีด้วยตนเอง</p>
                          <p className="mt-1 text-xs text-amber-100/75">ไม่ต้องกรอกยอดหรือเลขอ้างอิงซ้ำ ระบบใช้ยอดออเดอร์และสร้างเลขติดตามภายในให้ ตรวจยอดเงินเข้าบัญชีร้านจริงก่อนติ๊กยืนยัน สลิปอย่างเดียวไม่เพียงพอ</p>
                        </div>
                        <div className="rounded-xl border border-white/15 bg-navy-deep/70 p-4">
                          <p className="text-xs text-white/60">ยอดที่ต้องตรวจในบัญชีร้าน</p>
                          <p className="mt-1 text-xl font-black text-white">฿{Number(payment.expected_amount).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</p>
                        </div>
                        <label className="block text-xs">บันทึกเหตุผลและหลักฐานที่ตรวจ (อย่างน้อย 10 ตัวอักษร)
                          <textarea maxLength={500} value={manualNote} onChange={(event) => setManualNote(event.target.value)} placeholder="เช่น ตรวจรายการเงินเข้าบัญชีร้านในแอปธนาคาร เวลา... ตรงกับออเดอร์นี้" className="mt-1 w-full rounded-lg border border-white/20 bg-navy-deep p-3 text-sm text-white" rows={2} />
                        </label>
                        <div className="space-y-2">
                          <label htmlFor="manual-payment-slip" onDragOver={(event) => { event.preventDefault(); setIsDraggingSlip(true); }} onDragLeave={() => setIsDraggingSlip(false)} onDrop={(event) => { event.preventDefault(); setIsDraggingSlip(false); chooseManualSlip(event.dataTransfer.files[0] ?? null); }}
                            className={`relative flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed p-4 text-center text-xs transition-colors ${isDraggingSlip ? "border-acid-lime bg-acid-lime/15" : "border-amber-200/30 bg-navy-deep/50 hover:border-acid-lime/60"}`}>
                            <Upload className="h-6 w-6" aria-hidden="true" />
                            <span className="font-bold">แนบสลิปเพิ่ม (ไม่บังคับ) · คลิกเพื่อเลือกไฟล์หรือลากมาวาง</span>
                            <span className="text-amber-100/70">หากลูกค้าส่งสลิปใน LINE แล้ว ไม่ต้องแนบซ้ำ · JPG, PNG, WebP ไม่เกิน 4 MB</span>
                            <input id="manual-payment-slip" type="file" accept="image/jpeg,image/png,image/webp" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" onChange={(event) => chooseManualSlip(event.target.files?.[0] ?? null)} />
                          </label>
                          {manualSlip && <div className="flex items-center gap-3 rounded-lg border border-white/15 p-2 text-xs">
                            {manualSlipPreview && <img src={manualSlipPreview} alt="ตัวอย่างสลิปที่จะแนบ" className="h-16 w-16 rounded object-cover" />}
                            <span className="min-w-0 flex-1 truncate">{manualSlip.name}</span>
                            <button type="button" onClick={() => setManualSlip(null)} className="rounded border border-white/20 px-2 py-1">นำออก</button>
                          </div>}
                        </div>
                        <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={manualBankConfirmed} onChange={(event) => setManualBankConfirmed(event.target.checked)} className="mt-0.5" />ฉันตรวจพบยอดนี้เข้าบัญชีร้านจริงแล้ว และไม่ได้ใช้รายการเงินเข้านี้กับออเดอร์อื่น</label>
                        <button type="button" onClick={verifyManualBankPayment} disabled={isManuallyVerifying} className="rounded-lg bg-acid-lime px-4 py-3 font-black text-navy-deep disabled:cursor-not-allowed disabled:opacity-40">
                          {isManuallyVerifying ? "กำลังยืนยัน..." : recoveryMode ? "ตรวจสต็อก กู้ออเดอร์ และส่งงานคลัง" : "ยืนยันเงินเข้าและส่งงานเข้าคลัง"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
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

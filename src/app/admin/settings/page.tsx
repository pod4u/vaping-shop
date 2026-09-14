"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, CheckCircle2, Database, FileSpreadsheet, KeyRound, Loader2, Save, ShoppingCart, Warehouse, XCircle } from "lucide-react";

interface SystemStatus {
  services: {
    admin: { configured: boolean };
    database: { configured: boolean; connected: boolean };
    line: { configured: boolean };
    orders: { connected: boolean; channel: string };
    stockImport: { configured: boolean; source: string; schedule: string; autoApply: boolean };
  };
  checkedAt: string;
}

interface WarehouseAccountSummary {
  configured: boolean;
  username: string;
  source: "admin" | "environment";
  updatedAt: string | null;
}

function StatusLabel({ ready, readyText = "พร้อมใช้งาน", pendingText = "ยังไม่พร้อม" }: { ready: boolean; readyText?: string; pendingText?: string }) {
  return ready ? (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-400"><CheckCircle2 className="h-4 w-4" />{readyText}</span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-400"><XCircle className="h-4 w-4" />{pendingText}</span>
  );
}

export default function AdminSettingsPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warehouseAccount, setWarehouseAccount] = useState<WarehouseAccountSummary | null>(null);
  const [warehouseUsername, setWarehouseUsername] = useState("");
  const [warehousePassword, setWarehousePassword] = useState("");
  const [warehousePasswordConfirm, setWarehousePasswordConfirm] = useState("");
  const [warehouseMessage, setWarehouseMessage] = useState("");
  const [warehouseError, setWarehouseError] = useState("");
  const [savingWarehouse, setSavingWarehouse] = useState(false);

  useEffect(() => {
    fetch("/api/admin/system-status", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("ตรวจสอบสถานะระบบไม่สำเร็จ");
        return response.json();
      })
      .then(setStatus)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "โหลดข้อมูลไม่สำเร็จ"));

    fetch("/api/admin/warehouse-credentials", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "โหลดบัญชีคลังสินค้าไม่สำเร็จ");
        return result.account as WarehouseAccountSummary;
      })
      .then((account) => {
        setWarehouseAccount(account);
        setWarehouseUsername(account.username);
      })
      .catch((loadError) => setWarehouseError(loadError instanceof Error ? loadError.message : "โหลดบัญชีคลังสินค้าไม่สำเร็จ"));
  }, []);

  async function saveWarehouseCredentials(event: React.FormEvent) {
    event.preventDefault();
    setWarehouseError("");
    setWarehouseMessage("");
    if (warehousePassword !== warehousePasswordConfirm) {
      setWarehouseError("รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน");
      return;
    }
    if (!window.confirm(`ยืนยันเปลี่ยนรหัสผ่านคลังสินค้าสำหรับ ${warehouseUsername.trim()} ใช่ไหม`)) return;
    setSavingWarehouse(true);
    try {
      const response = await fetch("/api/admin/warehouse-credentials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: warehouseUsername, password: warehousePassword }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "เปลี่ยนบัญชีคลังสินค้าไม่สำเร็จ");
      setWarehouseAccount(result.account);
      setWarehousePassword("");
      setWarehousePasswordConfirm("");
      setWarehouseMessage(result.message);
    } catch (saveError) {
      setWarehouseError(saveError instanceof Error ? saveError.message : "เปลี่ยนบัญชีคลังสินค้าไม่สำเร็จ");
    } finally {
      setSavingWarehouse(false);
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-bold text-white">ตั้งค่าระบบ</h1>
        <p className="mt-1 text-white/50">แสดงสถานะการเชื่อมต่อจริง โดยไม่เปิดเผยรหัสหรือ Token</p>
      </div>

      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-300">{error}</div>}
      {!status && !error ? (
        <div className="flex items-center gap-2 py-12 text-white/50"><Loader2 className="h-5 w-5 animate-spin" />กำลังตรวจสอบระบบ...</div>
      ) : status && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-white/10 bg-white/5">
            <CardHeader className="flex flex-row items-center gap-3"><KeyRound className="h-5 w-5 text-acid-lime" /><div><CardTitle className="text-white">ระบบแอดมิน</CardTitle><CardDescription className="text-white/50">รหัสผ่านและ Session</CardDescription></div></CardHeader>
            <CardContent><StatusLabel ready={status.services.admin.configured} /></CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5">
            <CardHeader className="flex flex-row items-center gap-3"><Database className="h-5 w-5 text-blue-400" /><div><CardTitle className="text-white">Supabase</CardTitle><CardDescription className="text-white/50">สินค้า สต็อก และลูกค้า</CardDescription></div></CardHeader>
            <CardContent><StatusLabel ready={status.services.database.configured && status.services.database.connected} readyText="เชื่อมต่อฐานข้อมูลแล้ว" pendingText="เชื่อมต่อฐานข้อมูลไม่ได้" /></CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5">
            <CardHeader className="flex flex-row items-center gap-3"><Bot className="h-5 w-5 text-green-400" /><div><CardTitle className="text-white">LINE Messaging API</CardTitle><CardDescription className="text-white/50">Webhook และการตอบข้อความ</CardDescription></div></CardHeader>
            <CardContent><StatusLabel ready={status.services.line.configured} readyText="ตั้งค่า Token แล้ว" pendingText="ยังไม่ได้ตั้งค่า Token" /></CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5">
            <CardHeader className="flex flex-row items-center gap-3"><ShoppingCart className="h-5 w-5 text-vapor-violet" /><div><CardTitle className="text-white">ฐานข้อมูลออเดอร์</CardTitle><CardDescription className="text-white/50">ช่องทางรับคำสั่งซื้อ: {status.services.orders.channel}</CardDescription></div></CardHeader>
            <CardContent><StatusLabel ready={status.services.orders.connected} readyText="บันทึกออเดอร์เข้าฐานข้อมูลแล้ว" pendingText="ยังรับออเดอร์ผ่านแชต LINE โดยตรง" /></CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5">
            <CardHeader className="flex flex-row items-center gap-3"><FileSpreadsheet className="h-5 w-5 text-emerald-400" /><div><CardTitle className="text-white">นำเข้าสต็อกกลางคืน</CardTitle><CardDescription className="text-white/50">{status.services.stockImport.source} · {status.services.stockImport.schedule}</CardDescription></div></CardHeader>
            <CardContent className="space-y-2">
              <StatusLabel ready={status.services.stockImport.configured} readyText="ตั้งค่าการเชื่อมต่อแล้ว" pendingText="ยังตั้งค่าการเชื่อมต่อไม่ครบ" />
              <p className="text-xs text-white/40">การอัปเดตอัตโนมัติ: {status.services.stockImport.autoApply ? "เปิด" : "ปิด — ต้องตรวจและกดยืนยัน"}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {status && <p className="text-xs text-white/30">ตรวจสอบล่าสุด {new Date(status.checkedAt).toLocaleString("th-TH")}</p>}

      <Card className="border-acid-lime/20 bg-acid-lime/[0.035]">
        <CardHeader className="flex flex-row items-start gap-3">
          <Warehouse className="mt-0.5 h-5 w-5 text-acid-lime" />
          <div>
            <CardTitle className="text-white">บัญชีระบบคลังสินค้า</CardTitle>
            <CardDescription className="mt-1 text-white/50">เปลี่ยนชื่อผู้ใช้และรหัสผ่านสำหรับหน้า /warehouse</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {!warehouseAccount && !warehouseError ? (
            <div className="flex items-center gap-2 py-5 text-sm text-white/50"><Loader2 className="h-4 w-4 animate-spin" />กำลังโหลดบัญชี...</div>
          ) : (
            <form onSubmit={saveWarehouseCredentials} className="max-w-2xl space-y-4">
              {warehouseAccount && (
                <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/60">
                  บัญชีปัจจุบัน: <strong className="font-mono text-white">{warehouseAccount.username || "ยังไม่ได้ตั้งค่า"}</strong>
                  <span className="ml-2 text-xs text-white/35">{warehouseAccount.source === "admin" ? "จัดการจากหน้าแอดมิน" : "ใช้ค่าตั้งต้นของระบบ"}</span>
                </div>
              )}
              <label className="block text-sm font-medium text-white/80">ชื่อผู้ใช้คลังสินค้า
                <input required value={warehouseUsername} onChange={(event) => setWarehouseUsername(event.target.value.toLowerCase())} autoComplete="username" maxLength={50} pattern="[a-z0-9._-]{3,50}" className="mt-2 w-full rounded-xl border border-white/15 bg-navy-deep px-4 py-3 text-white outline-none focus:border-acid-lime" placeholder="เช่น warehouse01" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-white/80">รหัสผ่านใหม่
                  <input required type="password" value={warehousePassword} onChange={(event) => setWarehousePassword(event.target.value)} autoComplete="new-password" minLength={8} maxLength={200} className="mt-2 w-full rounded-xl border border-white/15 bg-navy-deep px-4 py-3 text-white outline-none focus:border-acid-lime" placeholder="อย่างน้อย 8 ตัวอักษร" />
                </label>
                <label className="block text-sm font-medium text-white/80">ยืนยันรหัสผ่านใหม่
                  <input required type="password" value={warehousePasswordConfirm} onChange={(event) => setWarehousePasswordConfirm(event.target.value)} autoComplete="new-password" minLength={8} maxLength={200} className="mt-2 w-full rounded-xl border border-white/15 bg-navy-deep px-4 py-3 text-white outline-none focus:border-acid-lime" placeholder="กรอกซ้ำอีกครั้ง" />
                </label>
              </div>
              <p className="text-xs leading-5 text-white/40">ระบบไม่แสดงหรือเก็บรหัสผ่านจริง หลังบันทึกให้ทีมคลังใช้รหัสใหม่ในการเข้าสู่ระบบครั้งถัดไป</p>
              {warehouseError && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{warehouseError}</p>}
              {warehouseMessage && <p role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">{warehouseMessage}</p>}
              <button type="submit" disabled={savingWarehouse || !warehouseAccount} className="btn-liquid-acid inline-flex min-h-12 items-center justify-center gap-2 px-5 py-3 font-bold text-navy-deep disabled:opacity-50">
                {savingWarehouse ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {savingWarehouse ? "กำลังบันทึก..." : "เปลี่ยนรหัสผ่านคลังสินค้า"}
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

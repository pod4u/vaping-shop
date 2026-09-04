"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, CheckCircle2, Database, KeyRound, Loader2, ShoppingCart, XCircle } from "lucide-react";

interface SystemStatus {
  services: {
    admin: { configured: boolean };
    database: { configured: boolean; connected: boolean };
    line: { configured: boolean };
    orders: { connected: boolean; channel: string };
  };
  checkedAt: string;
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

  useEffect(() => {
    fetch("/api/admin/system-status", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("ตรวจสอบสถานะระบบไม่สำเร็จ");
        return response.json();
      })
      .then(setStatus)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "โหลดข้อมูลไม่สำเร็จ"));
  }, []);

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
        </div>
      )}

      {status && <p className="text-xs text-white/30">ตรวจสอบล่าสุด {new Date(status.checkedAt).toLocaleString("th-TH")}</p>}
    </div>
  );
}

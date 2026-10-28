"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BellRing, Bot, CheckCircle2, Database, FileSpreadsheet, KeyRound, Loader2, MessageCircle, RefreshCw, Save, Send, Settings2, ShieldCheck, ShoppingCart, UserPlus, UsersRound, Warehouse, XCircle, type LucideIcon } from "lucide-react";

interface SystemStatus {
  services: {
    admin: { configured: boolean };
    database: { configured: boolean; connected: boolean };
    line: { configured: boolean };
    facebook: { appConfigured: boolean; webhookConfigured: boolean; pageConnected: boolean };
    telegram: { tokenConfigured: boolean };
    orders: { connected: boolean; channel: string };
    stockImport: { configured: boolean; source: string; schedule: string; autoApply: boolean };
  };
  checkedAt: string;
}

interface TelegramDestination {
  id: string;
  title: string;
  type: "private" | "group" | "supergroup" | "channel";
}

interface TelegramStatus {
  tokenConfigured: boolean;
  connected: boolean;
  destination: (TelegramDestination & { enabled: boolean; updatedAt: string }) | null;
  latestDelivery: { status: string; sent_at: string | null; last_error: string | null; updated_at: string } | null;
}

interface WarehouseAccountSummary {
  configured: boolean;
  username: string;
  source: "admin" | "environment";
  updatedAt: string | null;
}

type AdminRole = "owner" | "manager" | "order_staff" | "support" | "stock_staff";

interface AdminAccountSummary {
  id: string;
  username: string;
  displayName: string;
  role: AdminRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

interface AdminSessionSummary {
  accountId: string;
  role: AdminRole;
}

const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  owner: "Owner — ทุกสิทธิ์",
  manager: "Manager — จัดการร้าน",
  order_staff: "พนักงานออเดอร์",
  support: "ฝ่ายบริการลูกค้า",
  stock_staff: "พนักงานสต็อก",
};

const INPUT_CLASS = "mt-2 min-h-12 w-full min-w-0 rounded-xl border border-white/10 bg-[#081326] px-4 py-3 text-base text-white outline-none transition placeholder:text-white/25 focus:border-acid-lime/60 focus:ring-2 focus:ring-acid-lime/10";
const PANEL_CLASS = "min-w-0 overflow-hidden rounded-3xl border border-white/[0.09] bg-[#0b1629]/95 shadow-[0_18px_60px_rgba(0,0,0,0.18)]";

function SectionHeading({ icon: Icon, title, description, tone = "text-acid-lime" }: { icon: LucideIcon; title: string; description: string; tone?: string }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
        <Icon className={`h-5 w-5 ${tone}`} />
      </span>
      <div className="min-w-0">
        <h2 className="text-lg font-bold leading-7 text-white sm:text-xl">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-white/50">{description}</p>
      </div>
    </div>
  );
}

function SystemStatusCard({ icon: Icon, title, description, children, tone }: { icon: LucideIcon; title: string; description: string; children: React.ReactNode; tone: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 transition-colors hover:bg-white/[0.055] sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]"><Icon className={`h-[18px] w-[18px] ${tone}`} /></span>
        <div className="min-w-0">
          <h3 className="font-semibold leading-6 text-white">{title}</h3>
          <p className="mt-0.5 break-words text-sm leading-5 text-white/45">{description}</p>
        </div>
      </div>
      <div className="mt-4 border-t border-white/[0.07] pt-3">{children}</div>
    </div>
  );
}

function StatusLabel({ ready, readyText = "พร้อมใช้งาน", pendingText = "ยังไม่พร้อม" }: { ready: boolean; readyText?: string; pendingText?: string }) {
  return ready ? (
    <span className="inline-flex min-w-0 items-start gap-2 text-sm font-semibold leading-5 text-emerald-300"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><span className="break-words">{readyText}</span></span>
  ) : (
    <span className="inline-flex min-w-0 items-start gap-2 text-sm font-semibold leading-5 text-amber-300"><XCircle className="mt-0.5 h-4 w-4 shrink-0" /><span className="break-words">{pendingText}</span></span>
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
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatus | null>(null);
  const [telegramDestinations, setTelegramDestinations] = useState<TelegramDestination[]>([]);
  const [telegramMessage, setTelegramMessage] = useState("");
  const [telegramError, setTelegramError] = useState("");
  const [telegramBusy, setTelegramBusy] = useState(false);
  const [adminSession, setAdminSession] = useState<AdminSessionSummary | null>(null);
  const [adminAccounts, setAdminAccounts] = useState<AdminAccountSummary[] | null>(null);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminDisplayName, setAdminDisplayName] = useState("");
  const [adminRole, setAdminRole] = useState<AdminRole>("owner");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState("");
  const [adminAccountMessage, setAdminAccountMessage] = useState("");
  const [adminAccountError, setAdminAccountError] = useState("");
  const [adminAccountBusy, setAdminAccountBusy] = useState(false);
  const [passwordAccountId, setPasswordAccountId] = useState<string | null>(null);
  const [replacementPassword, setReplacementPassword] = useState("");
  const [replacementPasswordConfirm, setReplacementPasswordConfirm] = useState("");

  async function loadAdminAccounts() {
    const response = await fetch("/api/admin/admin-accounts", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "โหลดบัญชีแอดมินไม่สำเร็จ");
    setAdminAccounts(result.accounts || []);
  }

  useEffect(() => {
    fetch("/api/admin/auth", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "โหลดสิทธิ์แอดมินไม่สำเร็จ");
        return result.session as AdminSessionSummary;
      })
      .then((session) => {
        setAdminSession(session);
        if (session.role === "owner") return loadAdminAccounts();
      })
      .catch((loadError) => setAdminAccountError(loadError instanceof Error ? loadError.message : "โหลดบัญชีแอดมินไม่สำเร็จ"));

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

    fetch("/api/admin/telegram", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "ตรวจสอบ Telegram ไม่สำเร็จ");
        return result.status as TelegramStatus;
      })
      .then(setTelegramStatus)
      .catch((loadError) => setTelegramError(loadError instanceof Error ? loadError.message : "ตรวจสอบ Telegram ไม่สำเร็จ"));
  }, []);

  async function saveNewAdminAccount(event: React.FormEvent) {
    event.preventDefault();
    setAdminAccountError("");
    setAdminAccountMessage("");
    if (adminPassword !== adminPasswordConfirm) {
      setAdminAccountError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      return;
    }
    setAdminAccountBusy(true);
    try {
      const response = await fetch("/api/admin/admin-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: adminUsername, displayName: adminDisplayName, role: adminRole, password: adminPassword }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "เพิ่มบัญชีแอดมินไม่สำเร็จ");
      setAdminUsername("");
      setAdminDisplayName("");
      setAdminPassword("");
      setAdminPasswordConfirm("");
      setAdminRole("owner");
      setAdminAccountMessage(result.message);
      await loadAdminAccounts();
    } catch (saveError) {
      setAdminAccountError(saveError instanceof Error ? saveError.message : "เพิ่มบัญชีแอดมินไม่สำเร็จ");
    } finally {
      setAdminAccountBusy(false);
    }
  }

  async function patchAdminAccount(id: string, payload: Record<string, unknown>, successMessage: string) {
    setAdminAccountBusy(true);
    setAdminAccountError("");
    setAdminAccountMessage("");
    try {
      const response = await fetch("/api/admin/admin-accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...payload }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "อัปเดตบัญชีแอดมินไม่สำเร็จ");
      setAdminAccountMessage(successMessage);
      await loadAdminAccounts();
      return true;
    } catch (saveError) {
      setAdminAccountError(saveError instanceof Error ? saveError.message : "อัปเดตบัญชีแอดมินไม่สำเร็จ");
      return false;
    } finally {
      setAdminAccountBusy(false);
    }
  }

  async function saveReplacementPassword(event: React.FormEvent) {
    event.preventDefault();
    if (!passwordAccountId) return;
    if (replacementPassword !== replacementPasswordConfirm) {
      setAdminAccountError("รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน");
      return;
    }
    const saved = await patchAdminAccount(passwordAccountId, { password: replacementPassword }, "เปลี่ยนรหัสผ่านแอดมินแล้ว");
    if (saved) {
      setPasswordAccountId(null);
      setReplacementPassword("");
      setReplacementPasswordConfirm("");
    }
  }

  async function discoverTelegram() {
    setTelegramBusy(true);
    setTelegramError("");
    setTelegramMessage("");
    try {
      const response = await fetch("/api/admin/telegram?discover=1", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "ค้นหาห้อง Telegram ไม่สำเร็จ");
      setTelegramStatus(result.status);
      setTelegramDestinations(result.destinations || []);
      if ((result.destinations || []).length === 0) {
        setTelegramError("ยังไม่พบห้อง กรุณาเปิด Telegram ส่ง /start ให้ Bot หรือเพิ่ม Bot เข้ากลุ่มแล้วส่งข้อความ 1 ครั้ง");
      }
    } catch (discoverError) {
      setTelegramError(discoverError instanceof Error ? discoverError.message : "ค้นหาห้อง Telegram ไม่สำเร็จ");
    } finally {
      setTelegramBusy(false);
    }
  }

  async function telegramAction(action: "connect" | "test", chatId?: string) {
    setTelegramBusy(true);
    setTelegramError("");
    setTelegramMessage("");
    try {
      const response = await fetch("/api/admin/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, chatId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "ดำเนินการไม่สำเร็จ");
      setTelegramMessage(result.message);
      const refreshed = await fetch("/api/admin/telegram", { cache: "no-store" });
      const refreshedResult = await refreshed.json();
      if (refreshed.ok) setTelegramStatus(refreshedResult.status);
    } catch (actionError) {
      setTelegramError(actionError instanceof Error ? actionError.message : "ดำเนินการไม่สำเร็จ");
    } finally {
      setTelegramBusy(false);
    }
  }

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
    <div className="mx-auto w-full max-w-[1320px] space-y-8 overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
      <header className="flex flex-col gap-5 border-b border-white/[0.08] pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-acid-lime/80"><Settings2 className="h-4 w-4" />Admin settings</div>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">ตั้งค่าระบบ</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55 sm:text-base">จัดการบัญชีทีมงาน การแจ้งเตือน และตรวจสอบสถานะบริการหลักของร้าน</p>
        </div>
        {status && <div className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/45">อัปเดต {new Date(status.checkedAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}</div>}
      </header>

      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-300">{error}</div>}
      {!status && !error ? (
        <div className="flex items-center gap-2 py-12 text-white/50"><Loader2 className="h-5 w-5 animate-spin" />กำลังตรวจสอบระบบ...</div>
      ) : status && (
        <section className={PANEL_CLASS}>
          <div className="border-b border-white/[0.08] px-5 py-5 sm:px-6">
            <SectionHeading icon={ShieldCheck} title="ภาพรวมระบบ" description="ดูสถานะล่าสุดของบริการที่ใช้รับออเดอร์ ตอบแชต และอัปเดตสต็อก" />
          </div>
          <div className="grid min-w-0 gap-3 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-3">
            <SystemStatusCard icon={KeyRound} title="ระบบแอดมิน" description="รหัสผ่านและ Session" tone="text-acid-lime"><StatusLabel ready={status.services.admin.configured} /></SystemStatusCard>
            <SystemStatusCard icon={Database} title="Supabase" description="สินค้า สต็อก และลูกค้า" tone="text-sky-300"><StatusLabel ready={status.services.database.configured && status.services.database.connected} readyText="เชื่อมต่อฐานข้อมูลแล้ว" pendingText="เชื่อมต่อฐานข้อมูลไม่ได้" /></SystemStatusCard>
            <SystemStatusCard icon={Bot} title="LINE Messaging API" description="Webhook และการตอบข้อความ" tone="text-emerald-300"><StatusLabel ready={status.services.line.configured} readyText="ตั้งค่า Token แล้ว" pendingText="ยังไม่ได้ตั้งค่า Token" /></SystemStatusCard>
            <SystemStatusCard icon={MessageCircle} title="Facebook Messenger" description="Webhook, เพจ และกล่องข้อความ" tone="text-blue-300">
              <div className="space-y-1.5">
              <StatusLabel ready={status.services.facebook.appConfigured && status.services.facebook.webhookConfigured && status.services.facebook.pageConnected} readyText="เชื่อมต่อครบแล้ว" pendingText="กำลังตั้งค่า" />
              <p className="text-xs text-white/40">App {status.services.facebook.appConfigured ? "✓" : "–"} · Webhook {status.services.facebook.webhookConfigured ? "✓" : "–"} · Page {status.services.facebook.pageConnected ? "✓" : "–"}</p>
              </div>
            </SystemStatusCard>
            <SystemStatusCard icon={ShoppingCart} title="ฐานข้อมูลออเดอร์" description={`ช่องทางรับคำสั่งซื้อ: ${status.services.orders.channel}`} tone="text-vapor-violet"><StatusLabel ready={status.services.orders.connected} readyText="บันทึกออเดอร์เข้าฐานข้อมูลแล้ว" pendingText="ยังรับออเดอร์ผ่านแชต LINE โดยตรง" /></SystemStatusCard>
            <SystemStatusCard icon={FileSpreadsheet} title="นำเข้าสต็อกกลางคืน" description={`${status.services.stockImport.source} · ${status.services.stockImport.schedule}`} tone="text-emerald-300">
              <div className="space-y-2">
              <StatusLabel ready={status.services.stockImport.configured} readyText="ตั้งค่าการเชื่อมต่อแล้ว" pendingText="ยังตั้งค่าการเชื่อมต่อไม่ครบ" />
              <p className="text-xs text-white/40">การอัปเดตอัตโนมัติ: {status.services.stockImport.autoApply ? "เปิด" : "ปิด — ต้องตรวจและกดยืนยัน"}</p>
              </div>
            </SystemStatusCard>
          </div>
        </section>
      )}

      {adminSession?.role === "owner" && (
        <Card className={`${PANEL_CLASS} border-vapor-violet/20 py-0`}>
          <CardHeader className="border-b border-white/[0.08] px-5 py-5 sm:px-6">
            <SectionHeading icon={UsersRound} title="บัญชีแอดมินและสิทธิ์ทีมงาน" description="เพิ่มผู้ใช้ กำหนดสิทธิ์ และจัดการรหัสผ่านจากหน้านี้ได้โดยตรง · เฉพาะ Owner" tone="text-vapor-violet" />
          </CardHeader>
          <CardContent className="space-y-6 p-4 sm:p-6">
            <form onSubmit={saveNewAdminAccount} className="min-w-0 space-y-5 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 sm:p-5">
              <div className="flex items-center gap-2 text-base font-bold text-white"><UserPlus className="h-5 w-5 text-acid-lime" />เพิ่มบัญชีใหม่</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-white/80">ชื่อที่แสดง
                  <input required value={adminDisplayName} onChange={(event) => setAdminDisplayName(event.target.value)} maxLength={80} className={INPUT_CLASS} placeholder="เช่น GodOwner" />
                </label>
                <label className="block text-sm font-medium text-white/80">ชื่อผู้ใช้
                  <input required value={adminUsername} onChange={(event) => setAdminUsername(event.target.value.toLowerCase())} autoComplete="username" maxLength={50} pattern="[a-z0-9._-]{3,50}" className={INPUT_CLASS} placeholder="เช่น godowner" />
                </label>
              </div>
              <label className="block text-sm font-medium text-white/80">ระดับสิทธิ์
                <select value={adminRole} onChange={(event) => setAdminRole(event.target.value as AdminRole)} className={INPUT_CLASS}>
                  {(Object.keys(ADMIN_ROLE_LABELS) as AdminRole[]).map((role) => <option key={role} value={role}>{ADMIN_ROLE_LABELS[role]}</option>)}
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-white/80">รหัสผ่าน
                  <input required type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} autoComplete="new-password" minLength={12} maxLength={200} className={INPUT_CLASS} placeholder="อย่างน้อย 12 ตัวอักษร" />
                </label>
                <label className="block text-sm font-medium text-white/80">ยืนยันรหัสผ่าน
                  <input required type="password" value={adminPasswordConfirm} onChange={(event) => setAdminPasswordConfirm(event.target.value)} autoComplete="new-password" minLength={12} maxLength={200} className={INPUT_CLASS} placeholder="กรอกซ้ำอีกครั้ง" />
                </label>
              </div>
              <div className="flex flex-col gap-3 border-t border-white/[0.07] pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-xl text-xs leading-5 text-white/40">ระบบเก็บเฉพาะรหัสผ่านที่ผ่านการแฮชและจะไม่แสดงรหัสผ่านเดิมอีก</p>
                <button type="submit" disabled={adminAccountBusy} className="inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-acid-lime px-5 py-3 font-bold text-navy-deep transition hover:bg-[#ddff49] disabled:opacity-50 sm:w-auto">
                {adminAccountBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                เพิ่มบัญชีแอดมิน
                </button>
              </div>
            </form>

            {adminAccounts === null && !adminAccountError ? (
              <div className="flex items-center gap-2 py-4 text-sm text-white/50"><Loader2 className="h-4 w-4 animate-spin" />กำลังโหลดบัญชีแอดมิน...</div>
            ) : adminAccounts && adminAccounts.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/50">ยังไม่มีบัญชีที่สร้างจากหน้าแอดมิน บัญชีเดิมจาก Vercel ยังเข้าใช้งานได้ตามปกติ</p>
            ) : (
              <div className="space-y-3">
                {adminAccounts?.map((account) => (
                  <div key={account.id} className="min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 sm:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-2"><strong className="break-words text-base text-white">{account.displayName}</strong><code className="max-w-full break-all rounded bg-white/[0.07] px-2 py-1 text-xs text-white/60">{account.username}</code><span className={`rounded-full px-2 py-1 text-xs font-bold ${account.active ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-300"}`}>{account.active ? "เปิดใช้งาน" : "ปิดใช้งาน"}</span></div>
                        <p className="mt-1 text-xs text-white/40">{ADMIN_ROLE_LABELS[account.role]} · เข้าล่าสุด {account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString("th-TH") : "ยังไม่เคย"}</p>
                      </div>
                      <div className="grid w-full min-w-0 gap-2 sm:grid-cols-3 lg:w-auto lg:grid-cols-[minmax(180px,1fr)_auto_auto]">
                        <select aria-label={`สิทธิ์ของ ${account.username}`} value={account.role} disabled={adminAccountBusy || account.id === adminSession.accountId} onChange={(event) => {
                          const nextRole = event.target.value as AdminRole;
                          if (window.confirm(`เปลี่ยนสิทธิ์ ${account.username} เป็น ${ADMIN_ROLE_LABELS[nextRole]} ใช่ไหม`)) void patchAdminAccount(account.id, { role: nextRole }, "เปลี่ยนสิทธิ์บัญชีแล้ว");
                        }} className="min-h-11 min-w-0 rounded-xl border border-white/10 bg-[#081326] px-3 text-sm text-white disabled:opacity-40">
                          {(Object.keys(ADMIN_ROLE_LABELS) as AdminRole[]).map((role) => <option key={role} value={role}>{ADMIN_ROLE_LABELS[role]}</option>)}
                        </select>
                        <button type="button" disabled={adminAccountBusy} onClick={() => setPasswordAccountId(passwordAccountId === account.id ? null : account.id)} className="min-h-11 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm font-bold text-white transition hover:bg-white/[0.08] disabled:opacity-40">เปลี่ยนรหัสผ่าน</button>
                        <button type="button" disabled={adminAccountBusy || account.id === adminSession.accountId} onClick={() => {
                          if (window.confirm(`${account.active ? "ปิด" : "เปิด"}บัญชี ${account.username} ใช่ไหม`)) void patchAdminAccount(account.id, { active: !account.active }, account.active ? "ปิดบัญชีแล้ว" : "เปิดบัญชีแล้ว");
                        }} className={`min-h-11 rounded-xl border px-3 text-sm font-bold transition disabled:opacity-40 ${account.active ? "border-red-400/25 bg-red-400/[0.04] text-red-300 hover:bg-red-400/[0.08]" : "border-emerald-400/25 bg-emerald-400/[0.04] text-emerald-300 hover:bg-emerald-400/[0.08]"}`}>{account.active ? "ปิดบัญชี" : "เปิดบัญชี"}</button>
                      </div>
                    </div>
                    {passwordAccountId === account.id && (
                      <form onSubmit={saveReplacementPassword} className="mt-5 grid min-w-0 gap-3 border-t border-white/[0.08] pt-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                        <input required type="password" value={replacementPassword} onChange={(event) => setReplacementPassword(event.target.value)} autoComplete="new-password" minLength={12} maxLength={200} className={`${INPUT_CLASS} mt-0`} placeholder="รหัสผ่านใหม่ 12 ตัวขึ้นไป" />
                        <input required type="password" value={replacementPasswordConfirm} onChange={(event) => setReplacementPasswordConfirm(event.target.value)} autoComplete="new-password" minLength={12} maxLength={200} className={`${INPUT_CLASS} mt-0`} placeholder="ยืนยันรหัสผ่านใหม่" />
                        <button type="submit" disabled={adminAccountBusy} className="min-h-12 rounded-xl bg-acid-lime px-4 font-bold text-navy-deep disabled:opacity-50">บันทึกรหัสใหม่</button>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            )}
            {adminAccountError && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{adminAccountError}</p>}
            {adminAccountMessage && <p role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">{adminAccountMessage}</p>}
          </CardContent>
        </Card>
      )}

      <div className="grid min-w-0 gap-6 xl:grid-cols-2 xl:items-start">
      <Card className={`${PANEL_CLASS} border-sky-400/15 py-0`}>
        <CardHeader className="border-b border-white/[0.08] px-5 py-5 sm:px-6">
          <SectionHeading icon={BellRing} title="แจ้งเตือนออเดอร์ทาง Telegram" description="แจ้งทันทีเมื่อตรวจสลิปผ่านและออเดอร์พร้อมแพ็ก" tone="text-sky-300" />
        </CardHeader>
        <CardContent className="min-w-0 space-y-5 p-4 sm:p-6">
          {!telegramStatus && !telegramError ? (
            <div className="flex items-center gap-2 py-4 text-sm text-white/50"><Loader2 className="h-4 w-4 animate-spin" />กำลังตรวจสอบ Telegram...</div>
          ) : telegramStatus && (
            <>
              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <div className="min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <p className="text-xs text-white/40">Bot Token</p>
                  <div className="mt-2"><StatusLabel ready={telegramStatus.tokenConfigured} readyText="ตั้งค่า Token แล้ว" pendingText="ยังไม่ได้ตั้งค่า Token" /></div>
                </div>
                <div className="min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <p className="text-xs text-white/40">ห้องรับแจ้งเตือน</p>
                  <div className="mt-2"><StatusLabel ready={telegramStatus.connected} readyText={telegramStatus.destination?.title || "เชื่อมต่อแล้ว"} pendingText="ยังไม่ได้เลือกห้อง" /></div>
                </div>
              </div>

              {!telegramStatus.connected && (
                <div className="rounded-2xl border border-sky-300/15 bg-sky-300/[0.05] p-4 text-sm leading-6 text-white/65">
                  <p className="font-bold text-white">เชื่อมต่อง่าย ๆ 2 ขั้นตอน</p>
                  <p className="mt-1">1. ส่ง <strong className="text-sky-200">/start</strong> ให้ Bot ใน Telegram หรือเพิ่ม Bot เข้ากลุ่มแล้วส่งข้อความ 1 ครั้ง</p>
                  <p>2. กลับมากด “ค้นหาห้อง Telegram” แล้วเลือกห้องด้านล่าง</p>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <button type="button" disabled={telegramBusy || !telegramStatus.tokenConfigured} onClick={() => void discoverTelegram()} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 font-bold text-white transition hover:bg-white/[0.08] disabled:opacity-40">
                  {telegramBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  ค้นหาห้อง Telegram
                </button>
                {telegramStatus.connected && (
                  <button type="button" disabled={telegramBusy} onClick={() => void telegramAction("test")} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-acid-lime px-4 py-2.5 font-bold text-navy-deep transition hover:bg-[#ddff49] disabled:opacity-40">
                    <Send className="h-4 w-4" />ส่งข้อความทดสอบ
                  </button>
                )}
              </div>

              {telegramDestinations.length > 0 && (
                <div className="grid gap-2">
                  <p className="text-sm font-bold text-white/80">เลือกห้องที่จะรับออเดอร์</p>
                  {telegramDestinations.map((destination) => (
                    <button key={destination.id} type="button" disabled={telegramBusy} onClick={() => void telegramAction("connect", destination.id)} className="flex min-h-14 min-w-0 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left transition hover:border-sky-300/40 hover:bg-sky-300/[0.07] disabled:opacity-40">
                      <span className="min-w-0"><strong className="block break-words text-white">{destination.title}</strong><span className="text-xs text-white/40">{destination.type === "private" ? "แชตส่วนตัว" : "กลุ่ม Telegram"}</span></span>
                      <span className="text-sm font-bold text-sky-200">เลือกห้องนี้</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          {telegramError && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{telegramError}</p>}
          {telegramMessage && <p role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">{telegramMessage}</p>}
        </CardContent>
      </Card>

      <Card className={`${PANEL_CLASS} border-acid-lime/15 py-0`}>
        <CardHeader className="border-b border-white/[0.08] px-5 py-5 sm:px-6">
          <SectionHeading icon={Warehouse} title="บัญชีระบบคลังสินค้า" description="เปลี่ยนชื่อผู้ใช้และรหัสผ่านสำหรับหน้า /warehouse" />
        </CardHeader>
        <CardContent className="min-w-0 p-4 sm:p-6">
          {!warehouseAccount && !warehouseError ? (
            <div className="flex items-center gap-2 py-5 text-sm text-white/50"><Loader2 className="h-4 w-4 animate-spin" />กำลังโหลดบัญชี...</div>
          ) : (
            <form onSubmit={saveWarehouseCredentials} className="min-w-0 space-y-5">
              {warehouseAccount && (
                <div className="min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white/60">
                  <span className="block text-xs text-white/35">บัญชีปัจจุบัน</span>
                  <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1"><strong className="break-all font-mono text-white">{warehouseAccount.username || "ยังไม่ได้ตั้งค่า"}</strong><span className="text-xs text-white/35">{warehouseAccount.source === "admin" ? "จัดการจากหน้าแอดมิน" : "ใช้ค่าตั้งต้นของระบบ"}</span></div>
                </div>
              )}
              <label className="block text-sm font-medium text-white/80">ชื่อผู้ใช้คลังสินค้า
                <input required value={warehouseUsername} onChange={(event) => setWarehouseUsername(event.target.value.toLowerCase())} autoComplete="username" maxLength={50} pattern="[a-z0-9._-]{3,50}" className={INPUT_CLASS} placeholder="เช่น warehouse01" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-white/80">รหัสผ่านใหม่
                  <input required type="password" value={warehousePassword} onChange={(event) => setWarehousePassword(event.target.value)} autoComplete="new-password" minLength={8} maxLength={200} className={INPUT_CLASS} placeholder="อย่างน้อย 8 ตัวอักษร" />
                </label>
                <label className="block text-sm font-medium text-white/80">ยืนยันรหัสผ่านใหม่
                  <input required type="password" value={warehousePasswordConfirm} onChange={(event) => setWarehousePasswordConfirm(event.target.value)} autoComplete="new-password" minLength={8} maxLength={200} className={INPUT_CLASS} placeholder="กรอกซ้ำอีกครั้ง" />
                </label>
              </div>
              <p className="text-xs leading-5 text-white/40">ระบบไม่แสดงหรือเก็บรหัสผ่านจริง หลังบันทึกให้ทีมคลังใช้รหัสใหม่ในการเข้าสู่ระบบครั้งถัดไป</p>
              {warehouseError && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{warehouseError}</p>}
              {warehouseMessage && <p role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">{warehouseMessage}</p>}
              <button type="submit" disabled={savingWarehouse || !warehouseAccount} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-acid-lime px-5 py-3 font-bold text-navy-deep transition hover:bg-[#ddff49] disabled:opacity-50 sm:w-auto">
                {savingWarehouse ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {savingWarehouse ? "กำลังบันทึก..." : "เปลี่ยนรหัสผ่านคลังสินค้า"}
              </button>
            </form>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

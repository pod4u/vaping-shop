"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import liff from "@line/liff";
import { resolveMemberLiffDestination } from "@/lib/member-liff-destination";
import { getLineAddUrl, resolveMemberLiffAccount } from "@/lib/line-account-links";

const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID?.trim();

export default function MemberLiffClient() {
  const router = useRouter();
  const [message, setMessage] = useState("กำลังยืนยันตัวตนผ่าน LINE");
  const [error, setError] = useState<string | null>(null);
  const [returnLineUrl, setReturnLineUrl] = useState(getLineAddUrl("primary"));

  useEffect(() => {
    let cancelled = false;

    async function authenticate() {
      try {
        if (!liffId) throw new Error("ยังไม่ได้ตั้งค่า LIFF ID");
        await liff.init({ liffId });
        const destination = resolveMemberLiffDestination(window.location.search);
        const accountAlias = resolveMemberLiffAccount(window.location.search);
        setReturnLineUrl(getLineAddUrl(accountAlias));
        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href });
          return;
        }

        const idToken = liff.getIDToken();
        if (!idToken) throw new Error("ไม่พบข้อมูลยืนยันตัวตนจาก LINE");

        if (!cancelled) setMessage("กำลังเปิดข้อมูลสมาชิกของคุณ");
        const response = await fetch("/api/customers/liff-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_token: idToken, account_alias: accountAlias }),
        });
        const result = await response.json();
        if (result.registration_url) {
          window.location.href = result.registration_url;
          return;
        }
        if (!response.ok || !result.success) {
          throw new Error(result.error || "ยังไม่พบสมาชิกที่เชื่อมกับ LINE นี้");
        }
        router.replace(destination);
      } catch (reason) {
        if (cancelled) return;
        setError(reason instanceof Error ? reason.message : "ไม่สามารถเข้าสู่ระบบสมาชิกได้");
      }
    }

    void authenticate();
    return () => { cancelled = true; };
  }, [router]);

  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <div className="vapor-card rounded-2xl border border-navy-border p-8">
        <div className="mb-4 text-4xl" aria-hidden="true">{error ? "⚠️" : "🔐"}</div>
        <h1 className="text-2xl font-black text-white">{error ? "เข้าใช้งานไม่ได้" : "กำลังเข้าสู่ระบบสมาชิก"}</h1>
        <p className="mt-3 text-sm leading-6 text-white/60">{error || message}</p>
        {error && (
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-full bg-acid-lime px-6 py-3 font-bold text-navy-deep"
            >
              ลองใหม่
            </button>
            <a href={returnLineUrl} className="text-sm text-white/60 underline">กลับไปที่ LINE OA</a>
          </div>
        )}
      </div>
    </div>
  );
}

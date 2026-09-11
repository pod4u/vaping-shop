"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import liff from "@line/liff";
import { resolveMemberLiffDestination } from "@/lib/member-liff-destination";
import { getLineAddUrl, resolveMemberLiffAccount } from "@/lib/line-account-links";

const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID?.trim();

const AUTH_STEPS = [
  "กำลังเชื่อมต่อกับ LINE",
  "กำลังยืนยันข้อมูลสมาชิก",
  "กำลังเปิดออเดอร์ของคุณ",
] as const;

export default function MemberLiffClient() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isTakingLonger, setIsTakingLonger] = useState(false);
  const [canRetry, setCanRetry] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [returnLineUrl, setReturnLineUrl] = useState(getLineAddUrl("primary"));

  useEffect(() => {
    let cancelled = false;
    const slowTimer = window.setTimeout(() => setIsTakingLonger(true), 5_000);
    const retryTimer = window.setTimeout(() => setCanRetry(true), 15_000);

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

        if (!cancelled) setStep(1);
        const idToken = liff.getIDToken();
        if (!idToken) throw new Error("ไม่พบข้อมูลยืนยันตัวตนจาก LINE");

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
        if (!cancelled) setStep(2);
        router.replace(destination);
      } catch (reason) {
        if (cancelled) return;
        setError(reason instanceof Error ? reason.message : "ไม่สามารถเข้าสู่ระบบสมาชิกได้");
      }
    }

    void authenticate();
    return () => {
      cancelled = true;
      window.clearTimeout(slowTimer);
      window.clearTimeout(retryTimer);
    };
  }, [router]);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg items-center px-4 py-16 text-center">
      <div className="vapor-card relative w-full overflow-hidden rounded-3xl border border-navy-border p-7 sm:p-9">
        {!error && (
          <>
            <div className="pointer-events-none absolute inset-x-10 top-0 h-24 rounded-full bg-acid-lime/15 blur-3xl" />
            <div className="relative mx-auto mb-7 flex h-24 w-24 items-center justify-center" aria-hidden="true">
              <span className="absolute inset-0 animate-ping rounded-full border border-acid-lime/25 [animation-duration:2.4s]" />
              <span className="absolute inset-3 animate-pulse rounded-full bg-acid-lime/10 blur-md" />
              <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-acid-lime/40 bg-navy-deep text-3xl font-black italic text-acid-lime shadow-[0_0_35px_rgba(200,255,0,0.2)]">
                P4U
              </span>
            </div>
          </>
        )}
        {error && <div className="mb-5 text-4xl" aria-hidden="true">⚠️</div>}

        <h1 className="relative text-2xl font-black text-white">
          {error ? "เข้าใช้งานไม่ได้" : "กำลังเข้าสู่ระบบสมาชิก"}
        </h1>
        <p className="relative mt-3 min-h-6 text-sm font-bold leading-6 text-white/70" aria-live="polite">
          {error || AUTH_STEPS[step]}
        </p>

        {!error && (
          <div className="relative mt-7">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-2/5 animate-[member-liff-progress_1.4s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-transparent via-acid-lime to-transparent" />
            </div>
            <ol className="mt-5 grid grid-cols-3 gap-2" aria-label="ขั้นตอนเข้าสู่ระบบ">
              {AUTH_STEPS.map((label, index) => {
                const isActive = index === step;
                const isDone = index < step;
                return (
                  <li key={label} className={isActive ? "text-acid-lime" : isDone ? "text-white/70" : "text-white/30"}>
                    <span className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full border text-xs font-black ${
                      isActive
                        ? "border-acid-lime bg-acid-lime text-navy-deep shadow-[0_0_18px_rgba(200,255,0,0.35)]"
                        : isDone
                          ? "border-acid-lime/40 bg-acid-lime/10 text-acid-lime"
                          : "border-white/15 bg-white/5"
                    }`}>
                      {isDone ? "✓" : index + 1}
                    </span>
                    <span className="mt-2 block text-[10px] leading-4">{label.replace("กำลัง", "")}</span>
                  </li>
                );
              })}
            </ol>
            {isTakingLonger && (
              <p className="mt-5 text-xs leading-5 text-white/45">ใกล้เสร็จแล้ว กรุณารอสักครู่นะคะ</p>
            )}
            {canRetry && (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-4 rounded-full border border-acid-lime/40 bg-acid-lime/10 px-6 py-2.5 text-sm font-bold text-acid-lime transition hover:bg-acid-lime/20"
              >
                โหลดใหม่อีกครั้ง
              </button>
            )}
          </div>
        )}
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
      <style jsx>{`
        @keyframes member-liff-progress {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  );
}

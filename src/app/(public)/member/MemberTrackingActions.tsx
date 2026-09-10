"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";

function trackingUrl(carrier: string | null, trackingNumber: string) {
  const normalizedCarrier = (carrier ?? "").toLowerCase();
  if (normalizedCarrier.includes("flash")) return "https://www.flashexpress.com/fle/tracking";
  if (normalizedCarrier.includes("ไปรษณีย์") || normalizedCarrier.includes("ems") || normalizedCarrier.includes("thailand post")) return "https://track.thailandpost.co.th/";
  if (normalizedCarrier.includes("kerry") || normalizedCarrier.includes("kex")) return "https://th.kex-express.com/th/track/";
  if (normalizedCarrier.includes("j&t") || normalizedCarrier.includes("j & t") || normalizedCarrier.includes("jnt")) return "https://www.jtexpress.co.th/service/track";
  return `https://www.google.com/search?q=${encodeURIComponent(`${carrier ?? ""} ${trackingNumber}`)}`;
}

export default function MemberTrackingActions({ carrier, trackingNumber }: { carrier: string | null; trackingNumber: string }) {
  const [copied, setCopied] = useState(false);

  async function copyTrackingNumber() {
    try {
      await navigator.clipboard.writeText(trackingNumber);
    } catch {
      const input = document.createElement("textarea");
      input.value = trackingNumber;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <a
        href={trackingUrl(carrier, trackingNumber)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-acid-lime px-3 text-sm font-black text-navy-deep"
      >
        <ExternalLink className="h-4 w-4" /> ติดตามพัสดุ
      </a>
      <button
        type="button"
        onClick={copyTrackingNumber}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 px-3 text-sm font-bold text-white"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
        {copied ? "คัดลอกแล้ว" : "คัดลอกเลข"}
      </button>
    </div>
  );
}

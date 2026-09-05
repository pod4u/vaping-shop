import type { Metadata } from "next";
import { getCanonical } from "@/lib/seo";
import StockClient from "./StockClient";

export const metadata: Metadata = {
  title: "สินค้าพร้อมส่ง - สต็อกจริง อัปเดตทุกนาที",
  description: "เช็คสต็อกสินค้าพอดแบบ real-time พร้อมส่งทันที ทุกแบรนด์ ทุกหมวดหมู่",
  alternates: { canonical: getCanonical("/stock") },
  openGraph: {
    title: "สินค้าพร้อมส่ง",
    description: "เช็คสต็อกสินค้าพอดแบบ real-time พร้อมส่งทันที",
    url: getCanonical("/stock"),
    type: "website",
    siteName: "Pod4U",
    locale: "th_TH",
  },
  robots: { index: true, follow: true },
};

export default function StockPage() {
  return <StockClient />;
}

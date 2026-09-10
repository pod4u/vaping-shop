import type { Metadata } from "next";
import { Inter, Prompt } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { baseMetadata, APP_URL, safeJsonLd } from "@/lib/seo";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const prompt = Prompt({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin", "thai"],
  variable: "--font-prompt",
});

export const metadata: Metadata = baseMetadata({
  title: {
    default: "Pod4U - พอตครบทุกแบบ พร้อมส่ง",
    template: `%s | Pod4U`,
  },
  description:
    "รวมพอตใช้แล้วทิ้งและพอดเปลี่ยนหัวจากแบรนด์ยอดนิยม MARBO, ALFA, M BAR อัปเดตสต็อกจริง พร้อมรายละเอียดทุกรุ่นและรสชาติ",
  alternates: { canonical: APP_URL },
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    type: "website",
    locale: "th_TH",
    siteName: "Pod4U",
    url: APP_URL,
    title: "Pod4U - พอตครบทุกแบบ พร้อมส่ง",
    description: "รวมพอตใช้แล้วทิ้งและพอดเปลี่ยนหัวจากแบรนด์ยอดนิยม อัปเดตสต็อกจริง พร้อมรายละเอียดครบทุกรุ่น",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pod4U - พอตครบทุกแบบ พร้อมส่ง",
    description: "รวมพอตใช้แล้วทิ้งและพอดเปลี่ยนหัวจากแบรนด์ยอดนิยม อัปเดตสต็อกจริง พร้อมรายละเอียดครบทุกรุ่น",
  },
});

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Store",
  name: "Pod4U",
  description: "รวมพอตใช้แล้วทิ้งและพอดเปลี่ยนหัวจากแบรนด์ยอดนิยม อัปเดตสต็อกจริง พร้อมรายละเอียดครบทุกรุ่น",
  url: APP_URL,
  address: {
    "@type": "PostalAddress",
    addressCountry: "TH",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className={`${inter.variable} ${prompt.variable} font-sans antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(organizationJsonLd) }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}

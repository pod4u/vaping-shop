import type { Metadata } from "next";
import { Inter, Prompt } from "next/font/google";
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
    default: "Pod4U - พอต พอด และพอตใช้แล้วทิ้ง",
    template: `%s | Pod4U`,
  },
  description:
    "รวมข้อมูลพอต พอด พอตใช้แล้วทิ้ง และพอดเปลี่ยนหัว พร้อมหน้าสินค้า MARBO, M BAR และรุ่นยอดนิยมที่อัปเดตจากสต็อกจริง",
  alternates: { canonical: APP_URL },
  openGraph: {
    type: "website",
    locale: "th_TH",
    siteName: "Pod4U",
    url: APP_URL,
    title: "Pod4U - พอต พอด และพอตใช้แล้วทิ้ง",
    description: "รวมข้อมูลพอต พอด พอตใช้แล้วทิ้ง และรุ่นยอดนิยม พร้อมรายละเอียดสินค้าและสต็อกล่าสุด",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pod4U - พอต พอด และพอตใช้แล้วทิ้ง",
    description: "รวมข้อมูลพอต พอด พอตใช้แล้วทิ้ง และรุ่นยอดนิยม พร้อมรายละเอียดสินค้าและสต็อกล่าสุด",
  },
});

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Store",
  name: "Pod4U",
  description: "รวมข้อมูลพอต พอด พอตใช้แล้วทิ้ง และพอดเปลี่ยนหัว พร้อมรายละเอียดสินค้าที่อัปเดตจากสต็อก",
  url: APP_URL,
  telephone: "",
  sameAs: [],
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
      </body>
    </html>
  );
}

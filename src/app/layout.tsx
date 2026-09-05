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
    default: "Pod4U - ร้านขายพอด ราคาส่ง ครบ จบในที่เดียว",
    template: `%s | Pod4U`,
  },
  description:
    "ร้านขายพอดเปลี่ยนหัว และพอดใช้แล้วทิ้ง ราคาส่ง ของแท้ 100% ส่งฟรีทั่วประเทศเมื่อซื้อครบ 800฿ สั่งผ่าน LINE @994tiktt",
  openGraph: {
    type: "website",
    locale: "th_TH",
    siteName: "Pod4U",
    title: "Pod4U - ร้านขายพอด ราคาส่ง",
    description: "ร้านขายพอดเปลี่ยนหัว และพอดใช้แล้วทิ้ง ราคาส่ง ของแท้ 100%",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pod4U - ร้านขายพอด ราคาส่ง",
    description: "ร้านขายพอดเปลี่ยนหัว และพอดใช้แล้วทิ้ง ราคาส่ง ของแท้ 100%",
  },
});

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Store",
  name: "Pod4U",
  description: "ร้านขายพอดเปลี่ยนหัว และพอดใช้แล้วทิ้ง ราคาส่ง ของแท้ 100%",
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

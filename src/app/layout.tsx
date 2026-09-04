import type { Metadata } from "next";
import { Prompt, Inter } from "next/font/google";
import "./globals.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import LineButton from "../components/LineButton";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const prompt = Prompt({
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-prompt",
});

export const metadata: Metadata = {
  title: "VAPING SHOP - ร้านขายพอด ราคาส่ง",
  description: "ร้านขายพอดเปลี่ยนหัว และพอดใช้แล้วทิ้ง ราคาส่ง ครบ จบในที่เดียว",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={cn("font-sans", inter.variable)}>
      <body className={`${prompt.className} bg-brand-void text-white antialiased selection:bg-acid-lime selection:text-black`}>
        {children}
      </body>
    </html>
  );
}
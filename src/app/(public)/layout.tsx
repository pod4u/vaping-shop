"use client";

import { usePathname } from "next/navigation";
import HeaderNavy from "@/components/HeaderNavy";
import FooterNavy from "@/components/FooterNavy";
import LineButtonNavy from "@/components/LineButtonNavy";
import WelcomePopup from "@/components/WelcomePopup";
import { CartProvider } from "@/hooks/use-cart";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isMemberPortal = pathname.startsWith("/member");
  const isMemberTransition = pathname.startsWith("/member/liff")
    || pathname.startsWith("/member/access");

  return (
    <CartProvider>
      {!isMemberTransition && <WelcomePopup />}
      <div className="bg-navy-deep min-h-screen">
        {!isMemberTransition && <HeaderNavy />}
        <main className={`min-h-screen ${isMemberTransition ? "" : "pt-20"}`}>{children}</main>
        {!isMemberPortal && <FooterNavy />}
        {!isMemberPortal && <LineButtonNavy />}
      </div>
    </CartProvider>
  );
}

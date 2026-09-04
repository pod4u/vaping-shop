import HeaderNavy from "@/components/HeaderNavy";
import FooterNavy from "@/components/FooterNavy";
import LineButtonNavy from "@/components/LineButtonNavy";
import WelcomePopup from "@/components/WelcomePopup";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <WelcomePopup />
      <div className="bg-navy-deep min-h-screen">
        <HeaderNavy />
        <main className="min-h-screen pt-20">{children}</main>
        <FooterNavy />
        <LineButtonNavy />
      </div>
    </>
  );
}
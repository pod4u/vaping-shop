import HeaderNavy from "@/components/HeaderNavy";
import FooterNavy from "@/components/FooterNavy";
import LineButtonNavy from "@/components/LineButtonNavy";
import AnnouncementBannerNavy from "@/components/AnnouncementBannerNavy";

export default function NavyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AnnouncementBannerNavy
        message="📢 แจ้งเปลี่ยน LINE ID ใหม่!"
        lineId="@994tiktt"
      />
      <div className="pt-12 sm:pt-14 bg-navy-deep min-h-screen">
        <HeaderNavy />
        <main className="min-h-screen">{children}</main>
        <FooterNavy />
        <LineButtonNavy />
      </div>
    </>
  );
}
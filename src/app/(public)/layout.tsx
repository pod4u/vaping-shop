import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LineButton from "@/components/LineButton";
import AnnouncementBanner from "@/components/AnnouncementBanner";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AnnouncementBanner
        message="📢 แจ้งเปลี่ยน LINE ID ใหม่!"
        lineId="@vaping_shop"
      />
      <div className="pt-12 sm:pt-14">
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
        <LineButton />
      </div>
    </>
  );
}
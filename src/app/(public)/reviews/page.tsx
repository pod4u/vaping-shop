import type { Metadata } from "next";
import { getCanonical } from "@/lib/seo";
import { ReviewsExperience } from "./ReviewsExperience";

export const metadata: Metadata = {
  title: "รีวิวจากลูกค้า",
  description: "รีวิวจากคำสั่งซื้อจริงของสมาชิก Pod4U ทั้งสินค้า การจัดส่ง บริการ และการใช้งานระบบ",
  alternates: { canonical: getCanonical("/reviews") },
  openGraph: {
    title: "รีวิวจากลูกค้า Pod4U",
    description: "ทุกรีวิวเชื่อมกับออเดอร์ในระบบและผ่านการตรวจสอบก่อนเผยแพร่",
    url: getCanonical("/reviews"),
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function ReviewsPage() {
  return <ReviewsExperience />;
}

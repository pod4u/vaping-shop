import type { Metadata } from "next";
import { ReviewsExperience, type ReviewsPreviewData } from "../ReviewsExperience";

export const metadata: Metadata = {
  title: "DEMO หน้ารีวิว | Pod4U",
  robots: { index: false, follow: false, nocache: true },
};

const previewData: ReviewsPreviewData = {
  summary: {
    average_rating: 4.8,
    total_reviews: 10,
    rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 2, 5: 8 },
  },
  reviews: [
    { id: "demo-01", rating: 5, category: "overall", review_text: "สั่งง่ายมากค่ะ ดูสต็อกกับสถานะออเดอร์ได้เอง ไม่ต้องทักถามหลายรอบ", published_at: "2026-09-10T11:24:00+07:00", masked_order_number: "P4U-***-7B81", masked_customer_name: "น*** (08X-XXX-4821)", verification_status: "delivered", items: [{ brand_name: "M BAR", product_name: "M BAR 10K", flavor_name: "ออลเบอร์รี่" }] },
    { id: "demo-02", rating: 5, category: "delivery", review_text: "แพ็กเรียบร้อย ส่งไวค่ะ เลขพัสดุขึ้นในหน้าสมาชิก เช็กสะดวกมาก", published_at: "2026-09-09T14:08:00+07:00", masked_order_number: "P4U-***-6643", masked_customer_name: "ก*** (09X-XXX-7315)", verification_status: "delivered", items: [{ brand_name: "RELX", product_name: "RELX Pod Pro 2", flavor_name: "มิ้นท์พีช" }] },
    { id: "demo-03", rating: 4, category: "service", review_text: "ระบบสมาชิกใช้งานง่ายค่ะ รายการสั่งซื้อกับที่อยู่เก็บไว้ครบ กลับมาสั่งรอบต่อไปสะดวก", published_at: "2026-09-08T09:42:00+07:00", masked_order_number: "P4U-***-3910", masked_customer_name: "ต*** (06X-XXX-2059)", verification_status: "payment_confirmed", items: [{ brand_name: "ALFA", product_name: "ALFA DUO MESH 20K", flavor_name: "แอปเปิ้ลเขียว" }] },
    { id: "demo-04", rating: 5, category: "product", review_text: "รสชัดดีค่ะ ของตรงกับที่เลือกในเว็บ ใช้งานได้ปกติ", published_at: "2026-09-07T16:15:00+07:00", masked_order_number: "P4U-***-A214", masked_customer_name: "พ*** (08X-XXX-9170)", verification_status: "delivered", items: [{ brand_name: "MOOD", product_name: "MOOD Monster 14K", flavor_name: "องุ่นเคียวโฮ" }] },
    { id: "demo-05", rating: 5, category: "overall", review_text: "เลือกสินค้าแล้วส่งรายการเข้า LINE ได้เลย ง่ายกว่าพิมพ์สั่งเองเยอะค่ะ", published_at: "2026-09-06T12:33:00+07:00", masked_order_number: "P4U-***-05D8", masked_customer_name: "ม*** (09X-XXX-3648)", verification_status: "shipped", items: [{ brand_name: "M BAR", product_name: "M BAR 10K", flavor_name: "สตรอว์เบอร์รี่" }] },
    { id: "demo-06", rating: 5, category: "delivery", review_text: "ได้รับของเรียบร้อยค่ะ ห่อมาดีและติดตามพัสดุจากหน้าออเดอร์ได้", published_at: "2026-09-05T10:05:00+07:00", masked_order_number: "P4U-***-92C5", masked_customer_name: "อ*** (06X-XXX-5082)", verification_status: "delivered", items: [{ brand_name: "VPLUS", product_name: "VPLUS", flavor_name: "แตงโม" }] },
    { id: "demo-07", rating: 4, category: "product", review_text: "สินค้าตรงตามรายการค่ะ มีแจ้งจำนวนคงเหลือก่อนสั่งทำให้เลือกง่าย", published_at: "2026-09-04T18:20:00+07:00", masked_order_number: "P4U-***-C731", masked_customer_name: "ส*** (08X-XXX-1264)", verification_status: "delivered", items: [{ brand_name: "MARBO", product_name: "MARBO BAR", flavor_name: "แตงโมบับเบิ้ลกัม" }] },
    { id: "demo-08", rating: 5, category: "service", review_text: "แอดมินตอบเป็นขั้นตอนดีค่ะ ยืนยันยอดกับที่อยู่ให้ตรวจอีกครั้งก่อนชำระ", published_at: "2026-09-03T13:47:00+07:00", masked_order_number: "P4U-***-4F09", masked_customer_name: "จ*** (09X-XXX-6903)", verification_status: "payment_confirmed", items: [{ brand_name: "ALFA", product_name: "ALFA DUO MESH 20K", flavor_name: "บลูไอซ์" }] },
    { id: "demo-09", rating: 5, category: "overall", review_text: "กลับมาสั่งรอบสองแล้วค่ะ ระบบจำข้อมูลสมาชิกไว้ ทำรายการเร็วขึ้นมาก", published_at: "2026-09-02T08:55:00+07:00", masked_order_number: "P4U-***-83E2", masked_customer_name: "ร*** (08X-XXX-4437)", verification_status: "shipped", items: [{ brand_name: "M BAR", product_name: "M BAR 10K", flavor_name: "องุ่น" }] },
    { id: "demo-10", rating: 5, category: "delivery", review_text: "เลขพัสดุอัปเดตในวันถัดไปตามที่แจ้งค่ะ กดเข้าไปเช็กจากหน้าสมาชิกได้เลย", published_at: "2026-09-01T15:10:00+07:00", masked_order_number: "P4U-***-1A66", masked_customer_name: "ล*** (06X-XXX-8720)", verification_status: "delivered", items: [{ brand_name: "RELX", product_name: "RELX Infinity", flavor_name: "เฟรชมิ้นท์" }] },
  ],
};

export default function ReviewsDesignPreviewPage() {
  return <ReviewsExperience previewData={previewData} previewMode />;
}

import Link from "next/link";
import { Star, MessageSquare } from "lucide-react";

export default function TestimonialsNavy() {
  return (
    <section className="py-16 px-4 bg-navy-surface">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="text-acid-lime text-xs font-mono tracking-widest uppercase mb-2">
            CUSTOMER REVIEWS
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            รีวิวจาก <span className="text-white-neon">สมาชิก Pod4U</span>
          </h2>
          <p className="text-white/50 text-sm mt-2">
            มีออเดอร์ในระบบ · ตรวจสอบก่อนเผยแพร่
          </p>
        </div>

        {/* Empty State / CTA */}
        <div className="vapor-card rounded-2xl p-8 border border-navy-border text-center max-w-2xl mx-auto">
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="w-8 h-8 text-white/20" />
              ))}
            </div>
          </div>

          <h3 className="text-xl font-bold text-white mb-3">
            รีวิวจากลูกค้าที่มีออเดอร์ในระบบ
          </h3>

          <p className="text-white/60 text-sm leading-relaxed mb-6">
            รีวิวทั้งหมดมาจากสมาชิกที่มีออเดอร์ในระบบค่ะ
            <br />
            รีวิวประสบการณ์สั่งซื้อหรือการใช้งานระบบ และรับส่วนลด ฿5 สำหรับออเดอร์ถัดไป
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/reviews"
              className="inline-flex items-center justify-center gap-2 bg-white/5 border border-white/15 px-6 py-3 rounded-xl text-sm font-bold text-white hover:bg-white/10 transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              ดูรีวิวทั้งหมด
            </Link>
            <Link
              href="/stock"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-acid-lime to-[#a3e635] text-navy-deep px-6 py-3 rounded-xl text-sm font-bold hover:shadow-acid transition-all"
            >
              สั่งซื้อสินค้าพร้อมส่ง
            </Link>
          </div>
        </div>

        {/* Trust Note */}
        <div className="text-center mt-8">
          <p className="text-white/30 text-xs">
            ✅ แสดงเฉพาะรีวิวที่แอดมินตรวจสอบและอนุมัติแล้วค่ะ
          </p>
        </div>
      </div>
    </section>
  );
}

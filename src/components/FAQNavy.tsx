"use client";

import { useState } from "react";

export default function FAQNavy() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: "สั่งซื้อสินค้ายังไง?",
      answer: "เลือกสินค้าที่ต้องการ → กดปุ่ม 'สั่งซื้อ' → ติดต่อผ่าน LINE เพื่อยืนยันออเดอร์และชำระเงิน",
      category: "วิธีสั่งซื้อ",
    },
    {
      question: "รับช่องทางการชำระเงินอะไรบ้าง?",
      answer: "รับ พร้อมเพย์ และ โอนเงินธนาคาร",
      category: "การชำระเงิน",
    },
    {
      question: "ส่งยังไง? ใช้เวลากี่วัน?",
      answer: "จัดส่งผ่าน EMS, Flash Express, Kerry รับภายใน 1-3 วันทำการ",
      category: "การจัดส่ง",
    },
    {
      question: "มีส่งฟรีไหม?",
      answer: "ส่งฟรีเมื่อสั่งซื้อครบ 800 บาทขึ้นไป",
      category: "การจัดส่ง",
    },
    {
      question: "สินค้าแท้ไหม?",
      answer: "สินค้าแท้ 100% รับประกันคุณภาพ นำเข้าจากต่างประเทศทั้งหมด",
      category: "คุณภาพสินค้า",
    },
    {
      question: "สินค้าเสีย/ไม่ได้ดังที่สั่ง ทำยังไง?",
      answer: "เปลี่ยนคืนได้ภายใน 7 วัน กรณีสินค้าเสียจากโรงงานหรือส่งผิด",
      category: "คุณภาพสินค้า",
    },
    {
      question: "สินค้าหมดเมื่อไรจะมา?",
      answer: "ทัก LINE แจ้งความต้องการได้เลย เราจะแจ้งเตือนเมื่อสินค้าเข้า",
      category: "อื่นๆ",
    },
    {
      question: "เปิดร้านกี่โมง?",
      answer: "รับออเดอร์ 24 ชั่วโมง จัดส่งทุกวัน 9:00-17:00 น.",
      category: "อื่นๆ",
    },
    {
      question: "สั่งขั้นต่ำกี่ชิ้น?",
      answer: "ไม่มีขั้นต่ำ สั่ง 1 ชิ้นก็ได้ แต่ซื้อมากยิ่งลดเยอะ!",
      category: "อื่นๆ",
    },
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-16 px-4 bg-navy-surface">
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="text-acid-lime text-xs font-mono tracking-widest uppercase mb-2">
            FAQ
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            คำถามที่ <span className="text-white-neon">พบบ่อย</span>
          </h2>
          <p className="text-white/50 text-sm mt-2">
            คำตอบที่คุณอยากรู้
          </p>
        </div>

        {/* FAQ List */}
        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="vapor-card rounded-2xl border border-navy-border overflow-hidden hover:border-white/40 transition-all duration-300"
            >
              {/* Question Button */}
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full flex items-center justify-between p-5 text-left"
              >
                <div className="flex items-center gap-3">
                  {/* Category Badge */}
                  <span className="hidden sm:inline-block px-2 py-1 rounded-lg bg-navy/30 border border-navy-border text-white/40 text-xs font-mono">
                    {faq.category}
                  </span>
                  <h3 className="text-white font-bold text-sm sm:text-base">
                    {faq.question}
                  </h3>
                </div>

                {/* Arrow Icon */}
                <svg
                  className={`w-5 h-5 text-white/40 transition-transform duration-300 ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Answer */}
              {openIndex === index && (
                <div className="px-5 pb-5 animate-slide-up">
                  <div className="pt-3 border-t border-navy-border">
                    <p className="text-white/70 text-sm leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-10">
          <p className="text-white/50 text-sm mb-4">มีคำถามอื่นๆ?</p>
          <a
            href="https://lin.ee/RU5qNLj"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-acid-lime to-[#a3e635] text-navy-deep px-6 py-3 rounded-full text-sm font-bold hover:shadow-acid transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 5.58 2 10c0 2.12.92 4.04 2.42 5.44L3 22l6.4-3.2c.84.13 1.71.2 2.6.2 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
            </svg>
            ทักถามใน LINE
          </a>
        </div>
      </div>
    </section>
  );
}
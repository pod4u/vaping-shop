import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "คำขอลบข้อมูล",
  description: "ขั้นตอนขอลบข้อมูลที่เชื่อมโยงกับ Facebook และช่องทางบริการลูกค้าของ Pod4U",
};

export default function DataDeletionPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-12 text-white/80">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl sm:p-10">
        <p className="text-sm font-semibold text-lime-300">Pod4U</p>
        <h1 className="mt-2 text-3xl font-black text-white">คำขอลบข้อมูลผู้ใช้</h1>
        <p className="mt-5 leading-7">หากคุณเคยติดต่อเราผ่าน Facebook Messenger หรือช่องทางบริการลูกค้า และต้องการลบข้อมูลที่เกี่ยวข้องกับคุณ ให้ดำเนินการดังนี้</p>
        <ol className="mt-6 list-decimal space-y-3 pl-6 leading-7">
          <li>ส่งข้อความมายัง Facebook Page หรือ LINE Official Account ของร้าน</li>
          <li>ระบุข้อความว่า “ขอลบข้อมูล” พร้อมชื่อโปรไฟล์และช่องทางที่เคยติดต่อ</li>
          <li>เจ้าหน้าที่อาจขอข้อมูลเพิ่มเติมเท่าที่จำเป็นเพื่อยืนยันว่าเป็นเจ้าของบัญชี โดยจะไม่ขอรหัสผ่านหรือรหัส OTP</li>
          <li>เมื่อยืนยันสำเร็จ เราจะลบหรือทำให้ข้อมูลไม่สามารถระบุตัวบุคคลได้ และแจ้งผลกลับผ่านช่องทางเดิม</li>
        </ol>
        <p className="mt-7 rounded-2xl border border-lime-300/20 bg-lime-300/5 p-4 text-sm leading-6">ระยะเวลาดำเนินการโดยทั่วไปไม่เกิน 30 วัน เว้นแต่จำเป็นต้องเก็บข้อมูลบางส่วนตามกฎหมาย การรักษาความปลอดภัย หรือการระงับข้อพิพาท</p>
        <p className="mt-7 text-sm text-white/50">อ่านรายละเอียดเพิ่มเติมได้ที่ <a className="font-semibold text-lime-300 underline" href="/privacy">นโยบายความเป็นส่วนตัว</a></p>
      </div>
    </div>
  );
}

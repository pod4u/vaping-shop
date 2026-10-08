import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "นโยบายความเป็นส่วนตัว",
  description: "นโยบายความเป็นส่วนตัวสำหรับเว็บไซต์และช่องทางบริการลูกค้าของ Pod4U",
};

const updatedAt = "8 ตุลาคม 2569";

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-12 text-white/80">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl sm:p-10">
        <p className="text-sm font-semibold text-lime-300">Pod4U</p>
        <h1 className="mt-2 text-3xl font-black text-white">นโยบายความเป็นส่วนตัว</h1>
        <p className="mt-2 text-sm text-white/45">ปรับปรุงล่าสุด {updatedAt}</p>

        <div className="mt-8 space-y-7 leading-7">
          <section>
            <h2 className="text-xl font-bold text-white">ข้อมูลที่เราเก็บ</h2>
            <p className="mt-2">เราอาจได้รับชื่อโปรไฟล์ รหัสผู้ใช้ ข้อความ รูปภาพหรือไฟล์ที่คุณส่ง และข้อมูลที่จำเป็นต่อการให้บริการ เมื่อคุณติดต่อผ่านเว็บไซต์ Facebook Messenger หรือ LINE Official Account</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-white">วัตถุประสงค์การใช้ข้อมูล</h2>
            <p className="mt-2">เราใช้ข้อมูลเพื่อแสดงและตอบบทสนทนาในระบบหลังบ้าน ให้บริการลูกค้า ตรวจสอบปัญหา ป้องกันการใช้งานที่ไม่เหมาะสม และปรับปรุงคุณภาพการให้บริการ โดยไม่ขายข้อมูลส่วนบุคคลให้บุคคลภายนอก</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-white">การเปิดเผยและการจัดเก็บ</h2>
            <p className="mt-2">ข้อมูลอาจถูกประมวลผลโดยผู้ให้บริการโครงสร้างพื้นฐาน ฐานข้อมูล และแพลตฟอร์มรับส่งข้อความเท่าที่จำเป็น เราจำกัดการเข้าถึงไว้สำหรับผู้ดูแลที่ได้รับอนุญาตและเก็บข้อมูลเท่าที่จำเป็นต่อวัตถุประสงค์ดังกล่าว</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-white">สิทธิ์และการลบข้อมูล</h2>
            <p className="mt-2">คุณสามารถขอเข้าถึง แก้ไข หรือขอลบข้อมูลที่เกี่ยวข้องกับบทสนทนาของคุณได้ โดยติดต่อเราผ่านช่องทาง Facebook Page หรือ LINE Official Account ของร้าน รายละเอียดขั้นตอนอยู่ที่หน้า <a className="font-semibold text-lime-300 underline" href="/data-deletion">คำขอลบข้อมูล</a></p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-white">การเปลี่ยนแปลงนโยบาย</h2>
            <p className="mt-2">เราอาจปรับปรุงนโยบายนี้เมื่อบริการหรือข้อกำหนดเปลี่ยนแปลง โดยจะแสดงวันที่ปรับปรุงล่าสุดไว้บนหน้านี้</p>
          </section>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Info, MessageCircle, ShoppingCart } from "lucide-react";

export default function AdminOrdersPage() {
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-bold text-white">ออเดอร์</h1>
        <p className="mt-1 text-white/50">สถานะระบบคำสั่งซื้อปัจจุบัน</p>
      </div>

      <Card className="border-blue-500/20 bg-blue-500/10">
        <CardContent className="flex gap-3 py-4 text-sm text-blue-100">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
          <p>เว็บไซต์ยังไม่ได้บันทึกออเดอร์ลงฐานข้อมูล ลูกค้าสั่งซื้อและคุยกับพนักงานผ่าน LINE โดยตรง จึงไม่มีตัวเลขยอดขายหรือรายการออเดอร์ให้แสดงในหน้านี้</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-white/10 bg-white/5">
          <CardHeader><CardTitle className="flex items-center gap-2 text-white"><MessageCircle className="h-5 w-5 text-green-400" />ช่องทางรับออเดอร์จริง</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><p className="font-medium text-white">LINE Official Account</p><p className="text-sm text-white/50">@994tiktt</p></div>
            <a href="https://lin.ee/RU5qNLj" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-acid-lime hover:underline">เปิด LINE ร้านค้า <ExternalLink className="h-4 w-4" /></a>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader><CardTitle className="flex items-center gap-2 text-white"><ShoppingCart className="h-5 w-5 text-vapor-violet" />ระบบออเดอร์ในอนาคต</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-white/60">
            <p>หากต้องการให้รายการแชตกลายเป็นออเดอร์ในหลังบ้าน ต้องเพิ่มตารางออเดอร์และขั้นตอนยืนยันสินค้า ลูกค้า ที่อยู่ การชำระเงิน และสถานะจัดส่ง</p>
            <Link href="/admin/settings" className="inline-block font-medium text-acid-lime hover:underline">ดูสถานะการเชื่อมต่อระบบ</Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

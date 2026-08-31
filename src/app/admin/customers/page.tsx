"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Users, UserPlus } from "lucide-react";

export default function AdminCustomersPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">ลูกค้า</h1>
        <p className="text-white/50 mt-1">จัดการข้อมูลลูกค้า</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-vapor-violet/20">
                <Users className="h-5 w-5 text-vapor-violet" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">0</p>
                <p className="text-xs text-white/50">ลูกค้าทั้งหมด</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-acid-lime/20">
                <UserPlus className="h-5 w-5 text-acid-lime" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">0</p>
                <p className="text-xs text-white/50">ลูกค้าใหม่วันนี้</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coming Soon */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="py-12">
          <div className="text-center">
            <Users className="h-16 w-16 text-white/20 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">เร็วๆ นี้</h2>
            <p className="text-white/50">ระบบลูกค้าจะเปิดใช้งานเมื่อเชื่อม LINE Bot แล้ว</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
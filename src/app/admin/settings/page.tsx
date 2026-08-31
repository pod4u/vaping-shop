"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Settings, Key, Bell, Store } from "lucide-react";
import { useState } from "react";

export default function AdminSettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'รหัสผ่านใหม่ไม่ตรงกัน' });
      return;
    }

    if (newPassword.length < 4) {
      setMessage({ type: 'error', text: 'รหัสผ่านต้องมีอย่างน้อย 4 ตัว' });
      return;
    }

    // TODO: Implement password change
    setMessage({ type: 'success', text: 'เปลี่ยนรหัสผ่านสำเร็จ (ต้อง implement API)' });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">ตั้งค่า</h1>
        <p className="text-white/50 mt-1">ตั้งค่าระบบ Admin Panel</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : 'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>
          {message.text}
        </div>
      )}

      {/* Password Settings */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Key className="h-5 w-5 text-acid-lime" />
            <div>
              <CardTitle className="text-white">รหัสผ่าน Admin</CardTitle>
              <CardDescription className="text-white/50">เปลี่ยนรหัสผ่านเข้าระบบ</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm text-white/70 mb-2 block">รหัสผ่านปัจจุบัน</label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="bg-white/10 border-white/20 text-white"
                placeholder="••••••"
              />
            </div>
            <div>
              <label className="text-sm text-white/70 mb-2 block">รหัสผ่านใหม่</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-white/10 border-white/20 text-white"
                placeholder="••••••"
              />
            </div>
            <div>
              <label className="text-sm text-white/70 mb-2 block">ยืนยันรหัสผ่านใหม่</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-white/10 border-white/20 text-white"
                placeholder="••••••"
              />
            </div>
          </div>
          <Button 
            onClick={handleChangePassword}
            className="bg-acid-lime text-brand-void hover:bg-acid-lime/90"
          >
            เปลี่ยนรหัสผ่าน
          </Button>
        </CardContent>
      </Card>

      {/* Store Info */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Store className="h-5 w-5 text-vapor-violet" />
            <div>
              <CardTitle className="text-white">ข้อมูลร้าน</CardTitle>
              <CardDescription className="text-white/50">ข้อมูลร้าน Vaping Shop</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm text-white/70 mb-2 block">ชื่อร้าน</label>
              <Input
                defaultValue="Vaping Shop"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-white/70 mb-2 block">เบอร์โทร</label>
              <Input
                defaultValue="09x-xxx-xxxx"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>
          <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
            บันทึกข้อมูลร้าน
          </Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-yellow-400" />
            <div>
              <CardTitle className="text-white">การแจ้งเตือน</CardTitle>
              <CardDescription className="text-white/50">ตั้งค่าการแจ้งเตือน (จะใช้กับ LINE Bot)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-white/50 text-sm">จะเปิดใช้งานเมื่อเชื่อม LINE Bot แล้ว</p>
        </CardContent>
      </Card>
    </div>
  );
}
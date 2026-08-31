"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Package,
  Users,
  Settings,
  LogOut,
  BarChart3,
  ShoppingCart,
} from "lucide-react";
import { useRouter } from "next/navigation";

const menuItems = [
  {
    title: "Dashboard",
    url: "/admin",
    icon: BarChart3,
  },
  {
    title: "สต็อกสินค้า",
    url: "/admin/stock",
    icon: Package,
  },
  {
    title: "ออเดอร์",
    url: "/admin/orders",
    icon: ShoppingCart,
  },
  {
    title: "ลูกค้า",
    url: "/admin/customers",
    icon: Users,
  },
  {
    title: "ตั้งค่า",
    url: "/admin/settings",
    icon: Settings,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    router.push('/admin/login');
    router.refresh();
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-[280px] bg-brand-void border-r border-brand-border flex flex-col z-50">
      {/* Header */}
      <div className="p-4 border-b border-brand-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-vapor-violet flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black text-lg">V</span>
          </div>
          <div>
            <h1 className="text-white font-bold">Admin Panel</h1>
            <p className="text-xs text-white/50">Vaping Shop</p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <p className="text-white/40 text-xs mb-3 px-2">เมนูหลัก</p>
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.title}>
              <Link
                href={item.url}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  pathname === item.url
                    ? 'bg-acid-lime/20 text-acid-lime'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{item.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-brand-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 w-full transition-colors"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium">ออกจากระบบ</span>
        </button>
      </div>
    </aside>
  );
}
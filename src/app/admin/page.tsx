"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Boxes, Package, PackageCheck, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface FlavorStock {
  id: string;
  name: string;
  nameTh: string | null;
  stock: number;
}

interface ProductStock {
  id: string;
  name: string;
  nameTh: string | null;
  flavors: FlavorStock[];
}

interface BrandStock {
  id: string;
  name: string;
  nameTh: string | null;
  color: string | null;
  products: ProductStock[];
}

interface Customer {
  id: number;
  full_name: string | null;
  phone: string;
  line_id: string | null;
  total_orders: number;
  total_spent: number;
  created_at: string;
}

interface DashboardData {
  brands: BrandStock[];
  customers: Customer[];
  lastUpdated: string | null;
}

const fallbackColors = ["#d4ff14", "#5b13ec", "#3b82f6", "#f472b6", "#22c55e", "#f59e0b", "#ef4444"];

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData>({ brands: [], customers: [], lastUpdated: null });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [stockResponse, customersResponse] = await Promise.all([
          fetch("/api/admin/stock", { cache: "no-store" }),
          fetch("/api/admin/customers", { cache: "no-store" }),
        ]);
        if (!stockResponse.ok || !customersResponse.ok) throw new Error("โหลดข้อมูลหลังบ้านไม่สำเร็จ");

        const [stockResult, customersResult] = await Promise.all([stockResponse.json(), customersResponse.json()]);
        if (!stockResult.success) throw new Error(stockResult.error || "โหลดข้อมูลสต็อกไม่สำเร็จ");

        setData({
          brands: stockResult.data || [],
          customers: customersResult.customers || [],
          lastUpdated: stockResult.lastUpdated || new Date().toISOString(),
        });
      } catch (loadError) {
        console.error("Error loading dashboard", loadError);
        setError(loadError instanceof Error ? loadError.message : "โหลดข้อมูลไม่สำเร็จ");
      } finally {
        setIsLoading(false);
      }
    };
    loadDashboard();

    // Auto refresh every 60 seconds
    const interval = setInterval(() => {
      loadDashboard();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const summary = useMemo(() => {
    let totalStock = 0;
    let totalVariants = 0;
    let availableVariants = 0;
    let lowStock = 0;
    let outOfStock = 0;
    let totalProducts = 0;
    const lowStockItems: Array<{ name: string; stock: number }> = [];

    const brandStock = data.brands.map((brand, index) => {
      let stock = 0;
      let variants = 0;
      totalProducts += brand.products.length;
      brand.products.forEach((product) => {
        product.flavors.forEach((flavor) => {
          const quantity = Number(flavor.stock) || 0;
          totalStock += quantity;
          stock += quantity;
          totalVariants += 1;
          variants += 1;
          if (quantity > 0) availableVariants += 1;
          if (quantity === 0) outOfStock += 1;
          if (quantity > 0 && quantity <= 5) {
            lowStock += 1;
            lowStockItems.push({ name: `${brand.name} · ${flavor.name || product.name}`, stock: quantity });
          }
        });
      });
      return {
        id: brand.id,
        name: brand.name,
        stock,
        variants,
        products: brand.products.length,
        color: brand.color || fallbackColors[index % fallbackColors.length],
      };
    });

    return {
      totalStock,
      totalVariants,
      availableVariants,
      lowStock,
      outOfStock,
      totalProducts,
      brandStock,
      lowStockItems: lowStockItems.sort((a, b) => a.stock - b.stock).slice(0, 8),
    };
  }, [data.brands]);

  const recentCustomers = data.customers.slice(0, 5);
  const statCards = [
    { title: "สต็อกรวม", value: summary.totalStock.toLocaleString(), note: "จำนวนชิ้นใน Supabase", icon: Package, color: "text-blue-400", bg: "bg-blue-500/20" },
    { title: "รายการพร้อมส่ง", value: summary.availableVariants.toLocaleString(), note: `จาก ${summary.totalVariants.toLocaleString()} variants`, icon: PackageCheck, color: "text-acid-lime", bg: "bg-acid-lime/20" },
    { title: "สินค้าเตือน", value: (summary.lowStock + summary.outOfStock).toLocaleString(), note: `${summary.lowStock} ใกล้หมด · ${summary.outOfStock} หมด`, icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/20" },
    { title: "ลูกค้าในระบบ", value: data.customers.length.toLocaleString(), note: "ข้อมูลที่บันทึกจริง", icon: Users, color: "text-vapor-violet", bg: "bg-vapor-violet/20" },
  ];

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-vapor-violet border-t-acid-lime" />
          <p className="text-white/60">กำลังโหลดข้อมูลจริงจาก Supabase...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 bg-brand-void p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="mt-1 text-white/50">ข้อมูลจริงจากระบบสินค้าและลูกค้า</p>
        </div>
        {data.lastUpdated && <p className="text-xs text-white/40">อัปเดตล่าสุด {new Date(data.lastUpdated).toLocaleString("th-TH")}</p>}
      </div>

      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-300">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="border-white/10 bg-white/5">
            <CardHeader className="flex flex-row items-center justify-between px-4 pb-2 pt-4">
              <CardTitle className="text-sm font-medium text-white/70">{stat.title}</CardTitle>
              <div className={`rounded-lg p-2 ${stat.bg}`}><stat.icon className={`h-5 w-5 ${stat.color}`} /></div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-2">
              <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
              <p className="mt-1 text-xs text-white/50">{stat.note}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-white/10 bg-white/5">
          <CardHeader><CardTitle className="text-white">สัดส่วนสต็อกตามแบรนด์</CardTitle><CardDescription className="text-white/50">คำนวณจากจำนวนสินค้าที่มีอยู่จริง</CardDescription></CardHeader>
          <CardContent>
            {summary.totalStock === 0 ? <div className="flex h-[260px] items-center justify-center text-white/40">ยังไม่มีสินค้าในสต็อก</div> : (
              <>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={summary.brandStock.filter((brand) => brand.stock > 0)} dataKey="stock" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                        {summary.brandStock.filter((brand) => brand.stock > 0).map((brand) => <Cell key={brand.id} fill={brand.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "#120d20", border: "1px solid #281d45", borderRadius: "8px" }} formatter={(value) => [`${Number(value).toLocaleString()} ชิ้น`, "สต็อก"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                  {summary.brandStock.map((brand) => (
                    <div key={brand.id} className="flex items-center justify-between gap-2 rounded-md bg-white/5 px-2 py-1.5">
                      <span className="truncate text-white/70"><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: brand.color }} />{brand.name}</span>
                      <span className="font-medium text-white">{brand.stock}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader><CardTitle className="text-white">รายการใกล้หมด</CardTitle><CardDescription className="text-white/50">แสดงรายการที่เหลือ 1–5 ชิ้น</CardDescription></CardHeader>
          <CardContent>
            {summary.lowStockItems.length === 0 ? <div className="flex h-[260px] items-center justify-center text-white/40">ไม่มีรายการใกล้หมด</div> : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.lowStockItems} layout="vertical" margin={{ left: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} stroke="#ffffff80" fontSize={12} domain={[0, 5]} />
                    <YAxis type="category" dataKey="name" stroke="#ffffff80" fontSize={10} width={125} tickFormatter={(value) => String(value).slice(0, 20)} />
                    <Tooltip contentStyle={{ backgroundColor: "#120d20", border: "1px solid #281d45", borderRadius: "8px" }} formatter={(value) => [`${Number(value)} ชิ้น`, "คงเหลือ"]} />
                    <Bar dataKey="stock" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-white/10 bg-white/5">
          <CardHeader className="flex flex-row items-center justify-between">
            <div><CardTitle className="text-white">ลูกค้าล่าสุด</CardTitle><CardDescription className="text-white/50">ข้อมูลที่ลงทะเบียนในระบบจริง</CardDescription></div>
            <Link href="/admin/customers" className="text-sm text-acid-lime hover:underline">ดูทั้งหมด</Link>
          </CardHeader>
          <CardContent>
            {recentCustomers.length === 0 ? <div className="py-12 text-center text-white/40">ยังไม่มีลูกค้าลงทะเบียน</div> : (
              <div className="space-y-3">
                {recentCustomers.map((customer) => (
                  <div key={customer.id} className="flex items-center justify-between rounded-lg bg-white/5 p-3">
                    <div><p className="font-medium text-white">{customer.full_name || "ไม่ระบุชื่อ"}</p><p className="text-xs text-white/50">{customer.phone || customer.line_id || "ไม่มีข้อมูลติดต่อ"}</p></div>
                    <p className="text-xs text-white/40">{new Date(customer.created_at).toLocaleDateString("th-TH")}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader><CardTitle className="text-white">แคตตาล็อกในระบบ</CardTitle><CardDescription className="text-white/50">{data.brands.length} แบรนด์ · {summary.totalProducts} รุ่น · {summary.totalVariants} variants</CardDescription></CardHeader>
          <CardContent className="space-y-2">
            {summary.brandStock.map((brand) => (
              <Link key={brand.id} href={`/admin/stock?brand=${brand.id}`} className="flex items-center justify-between rounded-lg bg-white/5 p-3 transition-colors hover:bg-white/10">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${brand.color}33` }}><Boxes className="h-4 w-4" style={{ color: brand.color }} /></div>
                  <div><p className="font-medium text-white">{brand.name}</p><p className="text-xs text-white/40">{brand.products} รุ่น · {brand.variants} variants</p></div>
                </div>
                <p className="font-bold text-acid-lime">{brand.stock} ชิ้น</p>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

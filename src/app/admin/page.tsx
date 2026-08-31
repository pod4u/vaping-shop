"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, ShoppingCart, Users, TrendingUp, DollarSign, Clock, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { brands } from "@/lib/brands";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface Stats {
  totalStock: number;
  totalFlavors: number;
  lowStock: number;
  outOfStock: number;
}

// Mock data for demo
const salesData = [
  { day: "จ", sales: 2100, orders: 4 },
  { day: "อ", sales: 1800, orders: 3 },
  { day: "พ", sales: 3200, orders: 6 },
  { day: "พฤ", sales: 2400, orders: 5 },
  { day: "ศ", sales: 2900, orders: 7 },
  { day: "ส", sales: 3500, orders: 8 },
  { day: "อา", sales: 2410, orders: 3 },
];

const brandSalesData = [
  { name: "Marbo", value: 35, color: "#ef4444" },
  { name: "Mood", value: 25, color: "#f472b6" },
  { name: "Alfa", value: 18, color: "#6366f1" },
  { name: "Vplus", value: 12, color: "#22c55e" },
  { name: "อื่นๆ", value: 10, color: "#64748b" },
];

const topProducts = [
  { name: "Marbo - Blueberry", sales: 45 },
  { name: "Mood - Mango", sales: 38 },
  { name: "Alfa - Grape", sales: 32 },
  { name: "Vplus - Mint", sales: 28 },
  { name: "Eskobar - Lychee", sales: 22 },
];

const mockTodayOrders = [
  { id: "001", customer: "คุณสมชาย", items: "Marbo x 2", total: 500, status: "pending", time: "10:30" },
  { id: "002", customer: "คุณสุดา", items: "Mood x 1, Alfa x 1", total: 770, status: "shipping", time: "09:15" },
  { id: "003", customer: "คุณวิภา", items: "Vplus x 3", total: 1140, status: "completed", time: "08:45" },
];

const mockRecentCustomers = [
  { name: "คุณสมชาย", phone: "08x-xxx-1234", orders: 5, totalSpent: 2500 },
  { name: "คุณสุดา", phone: "08x-xxx-5678", orders: 3, totalSpent: 1500 },
  { name: "คุณวิภา", phone: "08x-xxx-9012", orders: 8, totalSpent: 4200 },
  { name: "คุณมานพ", phone: "08x-xxx-3456", orders: 2, totalSpent: 900 },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalStock: 0,
    totalFlavors: 0,
    lowStock: 0,
    outOfStock: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await fetch('/api/admin/stock');
      const data = await res.json();

      if (data.success) {
        let totalStock = 0;
        let totalFlavors = 0;
        let lowStock = 0;
        let outOfStock = 0;

        data.data.forEach((brand: any) => {
          brand.products?.forEach((product: any) => {
            product.flavors?.forEach((flavor: any) => {
              totalStock += flavor.stock || 0;
              totalFlavors++;
              if (flavor.stock === 0) outOfStock++;
              else if (flavor.stock <= 5) lowStock++;
            });
          });
        });

        setStats({ totalStock, totalFlavors, lowStock, outOfStock });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    {
      title: "ยอดขายวันนี้",
      value: "฿2,410",
      change: "+15%",
      changeType: "up",
      icon: DollarSign,
      color: "text-acid-lime",
      bgColor: "bg-acid-lime/20",
    },
    {
      title: "ออเดอร์วันนี้",
      value: "3",
      change: "+2",
      changeType: "up",
      icon: ShoppingCart,
      color: "text-vapor-violet",
      bgColor: "bg-vapor-violet/20",
    },
    {
      title: "สต็อกรวม",
      value: stats.totalStock,
      change: `${stats.totalFlavors - stats.outOfStock} รส`,
      changeType: "neutral",
      icon: Package,
      color: "text-blue-400",
      bgColor: "bg-blue-500/20",
    },
    {
      title: "สินค้าเตือน",
      value: stats.lowStock + stats.outOfStock,
      change: `${stats.outOfStock} หมด`,
      changeType: "down",
      icon: TrendingUp,
      color: "text-red-400",
      bgColor: "bg-red-500/20",
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-400">รอดำเนินการ</Badge>;
      case "shipping":
        return <Badge className="bg-blue-500/20 text-blue-400">กำลังจัดส่ง</Badge>;
      case "completed":
        return <Badge className="bg-acid-lime/20 text-acid-lime">สำเร็จ</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-vapor-violet border-t-acid-lime rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-brand-void min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-white/50 mt-1">ภาพรวมร้าน Vaping Shop • {new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="bg-white/5 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/70">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${stat.color}`}>
                {stat.value}
              </div>
              <div className="flex items-center gap-1 mt-1">
                {stat.changeType === "up" && <ArrowUpRight className="h-3 w-3 text-green-400" />}
                {stat.changeType === "down" && <ArrowDownRight className="h-3 w-3 text-red-400" />}
                <span className={`text-xs ${
                  stat.changeType === "up" ? "text-green-400" : 
                  stat.changeType === "down" ? "text-red-400" : 
                  "text-white/50"
                }`}>
                  {stat.change}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sales Line Chart */}
        <Card className="lg:col-span-2 bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">ยอดขาย 7 วันล่าสุด</CardTitle>
            <CardDescription className="text-white/50">กราฟแสดงยอดขายรายวัน (บาท)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                  <XAxis dataKey="day" stroke="#ffffff80" fontSize={12} />
                  <YAxis stroke="#ffffff80" fontSize={12} tickFormatter={(v) => `฿${v/1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#120d20', border: '1px solid #281d45', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                    itemStyle={{ color: '#d4ff14' }}
                    formatter={(value: number) => [`฿${value.toLocaleString()}`, 'ยอดขาย']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="#d4ff14" 
                    strokeWidth={3}
                    dot={{ fill: '#d4ff14', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#d4ff14', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Brand Pie Chart */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">สัดส่วนแบรนด์</CardTitle>
            <CardDescription className="text-white/50">% ยอดขายแต่ละแบรนด์</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={brandSalesData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {brandSalesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#120d20', border: '1px solid #281d45', borderRadius: '8px' }}
                    formatter={(value: number) => [`${value}%`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-1">
              {brandSalesData.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
                    <span className="text-white/70">{item.name}</span>
                  </div>
                  <span className="text-white font-medium">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Products Bar Chart */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">สินค้าขายดี Top 5</CardTitle>
            <CardDescription className="text-white/50">จำนวนชิ้นที่ขายได้</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" horizontal={false} />
                  <XAxis type="number" stroke="#ffffff80" fontSize={12} />
                  <YAxis type="category" dataKey="name" stroke="#ffffff80" fontSize={11} width={120} tickFormatter={(v) => v.split(' - ')[1]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#120d20', border: '1px solid #281d45', borderRadius: '8px' }}
                    formatter={(value: number) => [`${value} ชิ้น`, 'ขายได้']}
                  />
                  <Bar dataKey="sales" fill="#5b13ec" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Today's Orders */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">ออเดอร์วันนี้</CardTitle>
                <CardDescription className="text-white/50">3 ออเดอร์ • ยอดรวม ฿2,410</CardDescription>
              </div>
              <a href="/admin/orders" className="text-acid-lime text-sm hover:underline">ดูทั้งหมด</a>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockTodayOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-vapor-violet/20 flex items-center justify-center">
                      <ShoppingCart className="h-5 w-5 text-vapor-violet" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{order.customer}</p>
                      <p className="text-white/50 text-xs">{order.items}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-acid-lime font-bold">฿{order.total}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-white/40 text-xs">{order.time}</span>
                      {getStatusBadge(order.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Customers */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">ลูกค้าล่าสุด</CardTitle>
                <CardDescription className="text-white/50">4 คนล่าสุด</CardDescription>
              </div>
              <a href="/admin/customers" className="text-acid-lime text-sm hover:underline">ดูทั้งหมด</a>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockRecentCustomers.map((customer, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-vapor-violet to-acid-lime flex items-center justify-center text-white font-bold">
                      {customer.name.charAt(5)}
                    </div>
                    <div>
                      <p className="text-white font-medium">{customer.name}</p>
                      <p className="text-white/50 text-xs">{customer.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium">{customer.orders} ออเดอร์</p>
                    <p className="text-acid-lime text-xs">฿{customer.totalSpent.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Brands Overview */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">แบรนด์ทั้งหมด</CardTitle>
            <CardDescription className="text-white/50">{brands.length} แบรนด์</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {brands.map((brand) => (
                <a
                  key={brand.id}
                  href={`/admin/stock?brand=${brand.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: brand.color }}
                  >
                    {brand.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-white font-medium">{brand.nameTh}</p>
                    <p className="text-white/50 text-xs">{brand.flavors.length} รส</p>
                  </div>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, UserPlus, Search } from "lucide-react";

interface Customer {
  id: number;
  full_name: string | null;
  phone: string;
  line_id: string | null;
  email: string | null;
  address: string;
  sub_district: string;
  province: string;
  total_orders: number;
  total_spent: number;
  created_at: string;
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/admin/customers");
      const data = await response.json();
      if (data.customers) {
        setCustomers(data.customers);
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCustomers = customers.filter((customer) => {
    const query = searchQuery.toLowerCase();
    return (
      (customer.full_name?.toLowerCase().includes(query) ?? false) ||
      (customer.phone?.includes(query) ?? false) ||
      (customer.line_id?.toLowerCase().includes(query) ?? false)
    );
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const today = new Date().toISOString().split("T")[0];
  const newCustomersToday = customers.filter((c) =>
    c.created_at.startsWith(today)
  ).length;

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
                <p className="text-2xl font-bold text-white">{customers.length}</p>
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
                <p className="text-2xl font-bold text-white">{newCustomersToday}</p>
                <p className="text-xs text-white/50">ลูกค้าใหม่วันนี้</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ค้นหาชื่อ, เบอร์โทร, LINE ID..."
          className="w-full px-4 py-3 pl-10 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-acid-lime/50"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
      </div>

      {/* Customers Table */}
      <Card className="bg-white/5 border-white/10 overflow-hidden">
        {isLoading ? (
          <CardContent className="py-12 text-center text-white/50">
            กำลังโหลดข้อมูล...
          </CardContent>
        ) : filteredCustomers.length === 0 ? (
          <CardContent className="py-12 text-center text-white/50">
            {searchQuery ? "ไม่พบลูกค้าที่ค้นหา" : "ยังไม่มีลูกค้าสมัครสมาชิก"}
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">
                    ชื่อ
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">
                    เบอร์โทร
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">
                    LINE ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">
                    จังหวัด
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white/50 uppercase">
                    ออเดอร์
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white/50 uppercase">
                    ยอดซื้อรวม
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">
                    วันที่สมัคร
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 text-sm text-white">
                      {customer.full_name || "ไม่ระบุชื่อ"}
                    </td>
                    <td className="px-4 py-3 text-sm text-white">
                      {customer.phone}
                    </td>
                    <td className="px-4 py-3 text-sm text-white/50">
                      {customer.line_id || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-white">
                      {customer.province || "-"}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-medium text-acid-lime">
                      {customer.total_orders}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-white">
                      ฿{customer.total_spent.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-white/50">
                      {formatDate(customer.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Total Stats */}
      {customers.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="py-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-white">
                  {customers.length}
                </div>
                <div className="text-xs text-white/50">ลูกค้าทั้งหมด</div>
              </div>
              <div>
                <div className="text-lg font-bold text-acid-lime">
                  {customers.reduce((sum, c) => sum + c.total_orders, 0)}
                </div>
                <div className="text-xs text-white/50">ออเดอร์ทั้งหมด</div>
              </div>
              <div>
                <div className="text-lg font-bold text-white">
                  ฿
                  {customers
                    .reduce((sum, c) => sum + c.total_spent, 0)
                    .toLocaleString()}
                </div>
                <div className="text-xs text-white/50">ยอดขายรวม</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

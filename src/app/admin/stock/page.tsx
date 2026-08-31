"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { brands, Brand, BrandFlavor } from "@/lib/brands";
import { Package, Plus, Minus, Save, RefreshCw } from "lucide-react";

interface FlavorStock {
  id: string;
  name: string;
  nameTh: string;
  color: string;
  image: string;
  stock: number;
}

interface ProductStock {
  id: string;
  name: string;
  nameTh: string;
  price: number;
  salePrice: number | null;
  puffCount: number;
  flavors: FlavorStock[];
}

interface BrandStock {
  id: string;
  name: string;
  nameTh: string;
  color: string;
  products: ProductStock[];
}

export default function AdminStockPage() {
  const [stockData, setStockData] = useState<BrandStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    loadStock();
  }, []);

  const loadStock = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/stock');
      const data = await res.json();

      if (data.success) {
        const mergedData = brands.map(brand => {
          const existingBrand = data.data.find((b: any) => b.id === brand.id);
          
          return {
            id: brand.id,
            name: brand.name,
            nameTh: brand.nameTh,
            color: brand.color,
            products: [{
              id: `${brand.id}-1`,
              name: brand.name,
              nameTh: brand.nameTh,
              price: getDefaultPrice(brand.id),
              salePrice: getSalePrice(brand.id),
              puffCount: brand.puffCount,
              flavors: brand.flavors.map(flavor => {
                const existingFlavor = existingBrand?.products?.[0]?.flavors?.find(
                  (f: any) => f.id === flavor.id
                );
                return {
                  id: flavor.id,
                  name: flavor.name,
                  nameTh: flavor.nameTh,
                  color: flavor.color || '#6B7280',
                  image: flavor.image,
                  stock: existingFlavor?.stock || 0
                };
              })
            }]
          };
        });
        
        setStockData(mergedData);
      }
    } catch (error) {
      console.error('Error loading stock:', error);
      setMessage({ type: 'error', text: 'โหลดข้อมูลไม่สำเร็จ' });
    } finally {
      setIsLoading(false);
    }
  };

  const getDefaultPrice = (brandId: string): number => {
    const prices: Record<string, number> = {
      alfa: 450, marbo: 280, mood: 320, vplus: 380,
      eskobar: 480, mbar: 350, relx: 450
    };
    return prices[brandId] || 350;
  };

  const getSalePrice = (brandId: string): number | null => {
    const salePrices: Record<string, number | null> = {
      marbo: 250, mood: 290, vplus: null, alfa: null,
      eskobar: null, mbar: null, relx: null
    };
    return salePrices[brandId] || null;
  };

  const updateStock = (brandId: string, flavorId: string, newStock: number) => {
    setStockData(prev => prev.map(brand => {
      if (brand.id !== brandId) return brand;
      
      return {
        ...brand,
        products: brand.products.map(product => ({
          ...product,
          flavors: product.flavors.map(flavor => 
            flavor.id === flavorId 
              ? { ...flavor, stock: Math.max(0, newStock) }
              : flavor
          )
        }))
      };
    }));
  };

  const incrementStock = (brandId: string, flavorId: string, amount: number) => {
    const brand = stockData.find(b => b.id === brandId);
    const flavor = brand?.products[0].flavors.find(f => f.id === flavorId);
    if (flavor) {
      updateStock(brandId, flavorId, flavor.stock + amount);
    }
  };

  const saveStock = () => {
    setShowConfirm(true);
  };

  const confirmSave = async () => {
    setIsSaving(true);
    setMessage(null);
    
    try {
      const res = await fetch('/api/admin/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brands: stockData })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'บันทึกข้อมูลสำเร็จ!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: data.error || 'บันทึกไม่สำเร็จ' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาด' });
    } finally {
      setIsSaving(false);
    }
  };

  const cancelSave = () => {
    setShowConfirm(false);
  };

  const getStockBadge = (stock: number) => {
    if (stock === 0) return <Badge variant="destructive">หมด</Badge>;
    if (stock <= 5) return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">น้อย</Badge>;
    return <Badge variant="secondary" className="bg-acid-lime/20 text-acid-lime">{stock}</Badge>;
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

  // Confirmation Modal
  const ConfirmModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 max-w-md mx-4 shadow-xl">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
            <Save className="h-8 w-8 text-yellow-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">ยืนยันการบันทึก</h2>
          <p className="text-white/60 mb-6">
            คุณแน่ใจว่าต้องการบันทึกข้อมูลสต็อกทั้งหมด?<br/>
            <span className="text-white/40 text-sm">การเปลี่ยนแปลงจะมีผลทันที</span>
          </p>
          <div className="flex gap-3 justify-center">
            <Button 
              onClick={cancelSave}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 px-6"
            >
              ยกเลิก
            </Button>
            <Button 
              onClick={confirmSave}
              className="bg-acid-lime text-brand-void hover:bg-acid-lime/90 px-6"
            >
              ยืนยันบันทึก
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Confirmation Modal */}
      {showConfirm && <ConfirmModal />}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">จัดการสต็อก</h1>
          <p className="text-white/50 mt-1">เพิ่ม/ลดจำนวนสินค้าในสต็อก</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadStock} className="border-white/20 text-white hover:bg-white/10">
            <RefreshCw className="h-4 w-4 mr-2" />
            รีเฟรช
          </Button>
          <Button onClick={saveStock} disabled={isSaving} className="bg-acid-lime text-brand-void hover:bg-acid-lime/90">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </div>
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

      {/* Brand Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedBrand === null ? "default" : "outline"}
          onClick={() => setSelectedBrand(null)}
          className={selectedBrand === null ? "bg-acid-lime text-brand-void" : "border-white/20 text-white/70"}
        >
          ทั้งหมด
        </Button>
        {stockData.map(brand => (
          <Button
            key={brand.id}
            variant={selectedBrand === brand.id ? "default" : "outline"}
            onClick={() => setSelectedBrand(brand.id)}
            style={selectedBrand === brand.id ? { backgroundColor: brand.color } : {}}
            className={selectedBrand === brand.id ? "text-white" : "border-white/20 text-white/70"}
          >
            {brand.nameTh}
          </Button>
        ))}
      </div>

      {/* Stock Table */}
      {stockData
        .filter(brand => !selectedBrand || brand.id === selectedBrand)
        .map(brand => (
        <Card key={brand.id} className="bg-white/5 border-white/10">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: brand.color }}
              >
                {brand.name.charAt(0)}
              </div>
              <div>
                <CardTitle className="text-white">{brand.name}</CardTitle>
                <p className="text-sm text-white/50">{brand.nameTh} • {brand.products[0].puffCount / 1000}K Puffs</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-white font-bold">฿{brand.products[0].price}</p>
                {brand.products[0].salePrice && (
                  <p className="text-acid-lime text-sm">โปรโมชั่น ฿{brand.products[0].salePrice}</p>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/50">รูป</TableHead>
                  <TableHead className="text-white/50">ชื่อ</TableHead>
                  <TableHead className="text-white/50">สี</TableHead>
                  <TableHead className="text-white/50 text-center">สต็อก</TableHead>
                  <TableHead className="text-white/50 text-center">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brand.products[0].flavors.map(flavor => (
                  <TableRow key={flavor.id} className="border-white/10">
                    <TableCell>
                      <img
                        src={flavor.image}
                        alt={flavor.name}
                        className="w-10 h-10 object-contain rounded bg-white/10"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/images/placeholder.png';
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-white font-medium">{flavor.nameTh}</p>
                        <p className="text-white/50 text-xs">{flavor.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div 
                        className="w-6 h-6 rounded-full border border-white/20"
                        style={{ backgroundColor: flavor.color }}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      {getStockBadge(flavor.stock)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => incrementStock(brand.id, flavor.id, -1)}
                          className="h-8 w-8 p-0 border-red-500/30 text-red-400 hover:bg-red-500/10"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={flavor.stock}
                          onChange={(e) => updateStock(brand.id, flavor.id, parseInt(e.target.value) || 0)}
                          className="w-16 h-8 text-center bg-white/10 border-white/20 text-white"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => incrementStock(brand.id, flavor.id, 1)}
                          className="h-8 w-8 p-0 border-green-500/30 text-green-400 hover:bg-green-500/10"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
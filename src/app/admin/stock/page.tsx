"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Plus, Minus, Save, RefreshCw } from "lucide-react";

// Types from Supabase
interface FlavorInfo {
  id: string;
  slug: string;
  name: string;
  name_th: string | null;
  color: string | null;
}

interface BrandInfo {
  id: string;
  slug: string;
  name: string;
  name_th: string | null;
  color: string | null;
}

interface FlavorStock {
  variantId: string;
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
  puffCount: number | null;
  flavors: FlavorStock[];
}

interface BrandStock {
  id: string;
  name: string;
  nameTh: string;
  color: string;
  products: ProductStock[];
}

interface ApiResponse {
  success: boolean;
  data: BrandStock[];
  error?: string;
  lastUpdated: string;
}

export default function AdminStockPage() {
  const [stockData, setStockData] = useState<BrandStock[]>([]);
  const [originalData, setOriginalData] = useState<BrandStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadStock();
  }, []);

  const loadStock = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/stock');
      const data: ApiResponse = await res.json();

      if (data.success) {
        setStockData(data.data);
        setOriginalData(JSON.parse(JSON.stringify(data.data))); // Deep copy for comparison
        setHasChanges(false);
      } else {
        setMessage({ type: 'error', text: data.error || 'โหลดข้อมูลไม่สำเร็จ' });
      }
    } catch (error) {
      console.error('Error loading stock:', error);
      setMessage({ type: 'error', text: 'โหลดข้อมูลไม่สำเร็จ' });
    } finally {
      setIsLoading(false);
    }
  };

  const updateStock = (brandId: string, productId: string, flavorId: string, newStock: number) => {
    setStockData(prev => prev.map(brand => {
      if (brand.id !== brandId) return brand;

      return {
        ...brand,
        products: brand.products.map(product => {
          if (product.id !== productId) return product;

          return {
            ...product,
            flavors: product.flavors.map(flavor =>
              flavor.id === flavorId
                ? { ...flavor, stock: Math.max(0, newStock) }
                : flavor
            )
          };
        })
      };
    }));

    // Check for changes
    setHasChanges(JSON.stringify(stockData) !== JSON.stringify(originalData));
  };

  const incrementStock = (brandId: string, productId: string, flavorId: string, amount: number) => {
    const brand = stockData.find(b => b.id === brandId);
    const product = brand?.products.find(p => p.id === productId);
    const flavor = product?.flavors.find(f => f.id === flavorId);
    if (flavor) {
      updateStock(brandId, productId, flavorId, flavor.stock + amount);
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
        setOriginalData(JSON.parse(JSON.stringify(stockData)));
        setHasChanges(false);
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: data.error || 'บันทึกไม่สำเร็จ' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาด' });
    } finally {
      setIsSaving(false);
      setShowConfirm(false);
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

  // Calculate totals
  const totalProducts = stockData.reduce((sum, b) => sum + b.products.length, 0);
  const totalFlavors = stockData.reduce((sum, b) => sum + b.products.reduce((s, p) => s + p.flavors.length, 0), 0);
  const totalStock = stockData.reduce((sum, b) => sum + b.products.reduce((s, p) => s + p.flavors.reduce((fs, f) => fs + f.stock, 0), 0), 0);
  const availableFlavors = stockData.reduce((sum, b) => sum + b.products.reduce((s, p) => s + p.flavors.filter(f => f.stock > 0).length, 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-vapor-violet border-t-acid-lime rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60">กำลังโหลดข้อมูลจาก Supabase...</p>
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
          <p className="text-white/50 mt-1">ข้อมูลจาก Supabase • {totalProducts} สินค้า, {totalFlavors} variants, {availableFlavors} พร้อมส่ง</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={loadStock} className="border-white/20 text-white hover:bg-white/10">
            <RefreshCw className="h-4 w-4 mr-2" />
            รีเฟรช
          </Button>
          <Button
            onClick={saveStock}
            disabled={isSaving || !hasChanges}
            className={hasChanges ? "bg-acid-lime text-brand-void hover:bg-acid-lime/90" : "bg-white/10 text-white/50 cursor-not-allowed"}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'กำลังบันทึก...' : hasChanges ? 'บันทึก*' : 'บันทึก'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="text-white/50 text-xs mb-1">Total Variants</div>
            <div className="text-2xl font-bold text-white">{totalFlavors}</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="text-white/50 text-xs mb-1">Available</div>
            <div className="text-2xl font-bold text-acid-lime">{availableFlavors}</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="text-white/50 text-xs mb-1">Total Stock</div>
            <div className="text-2xl font-bold text-white">{totalStock}</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="text-white/50 text-xs mb-1">Brands</div>
            <div className="text-2xl font-bold text-white">{stockData.length}</div>
          </CardContent>
        </Card>
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
          ทั้งหมด ({totalFlavors})
        </Button>
        {stockData.map(brand => {
          const brandFlavorCount = brand.products.reduce((s, p) => s + p.flavors.length, 0);
          return (
            <Button
              key={brand.id}
              variant={selectedBrand === brand.id ? "default" : "outline"}
              onClick={() => setSelectedBrand(brand.id)}
              style={selectedBrand === brand.id ? { backgroundColor: brand.color || '#7928ca' } : {}}
              className={selectedBrand === brand.id ? "text-white" : "border-white/20 text-white/70"}
            >
              {brand.nameTh || brand.name} ({brandFlavorCount})
            </Button>
          );
        })}
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
                style={{ backgroundColor: brand.color || '#7928ca' }}
              >
                {brand.name.charAt(0)}
              </div>
              <div>
                <CardTitle className="text-white">{brand.name}</CardTitle>
                <p className="text-sm text-white/50">
                  {brand.nameTh} • {brand.products.length} สินค้า • {brand.products.reduce((s, p) => s + p.flavors.length, 0)} variants
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {brand.products.map(product => (
              <div key={product.id} className="mb-6 last:mb-0">
                <div className="flex items-center justify-between mb-3 px-2">
                  <div>
                    <h4 className="text-white font-bold">{product.nameTh || product.name}</h4>
                    {product.puffCount && (
                      <span className="text-white/40 text-xs">{(product.puffCount / 1000)}K Puffs</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-acid-lime font-bold">฿{product.salePrice || product.price}</span>
                    {product.salePrice && (
                      <span className="text-white/40 text-xs line-through ml-2">฿{product.price}</span>
                    )}
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-white/50 w-16">รูป</TableHead>
                      <TableHead className="text-white/50">รสชาติ</TableHead>
                      <TableHead className="text-white/50 w-20">สี</TableHead>
                      <TableHead className="text-white/50 text-center w-24">สต็อก</TableHead>
                      <TableHead className="text-white/50 text-center w-36">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {product.flavors.map(flavor => (
                      <TableRow key={flavor.variantId} className="border-white/10">
                        <TableCell>
                          <img
                            src={flavor.image}
                            alt={flavor.name}
                            className="w-10 h-10 object-contain rounded bg-white/10"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://placehold.co/100x100/120d20/5b13ec?text=X';
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
                            style={{ backgroundColor: flavor.color || '#6B7280' }}
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
                              onClick={() => incrementStock(brand.id, product.id, flavor.id, -1)}
                              className="h-8 w-8 p-0 border-red-500/30 text-red-400 hover:bg-red-500/10"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <Input
                              type="number"
                              value={flavor.stock}
                              onChange={(e) => updateStock(brand.id, product.id, flavor.id, parseInt(e.target.value) || 0)}
                              className="w-16 h-8 text-center bg-white/10 border-white/20 text-white"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => incrementStock(brand.id, product.id, flavor.id, 1)}
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
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Empty State */}
      {stockData.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <p className="text-white/50">ไม่พบข้อมูลสินค้าใน Supabase</p>
          <p className="text-white/30 text-sm mt-2">กรุณาตรวจสอบการเชื่อมต่อ Supabase</p>
        </div>
      )}
    </div>
  );
}
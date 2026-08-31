import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { brands } from '@/lib/brands';

const STOCK_FILE = path.join(process.cwd(), 'src/data/stock.json');

export async function GET() {
  try {
    if (!fs.existsSync(STOCK_FILE)) {
      return NextResponse.json({
        success: false,
        error: 'ไม่มีข้อมูลสินค้า',
        data: [],
        lastUpdated: new Date().toISOString()
      });
    }

    const fileContents = fs.readFileSync(STOCK_FILE, 'utf8');
    const stockData = JSON.parse(fileContents);
    
    // Merge กับ brands.ts เพื่อเพิ่มรูปภาพ
    const availableBrands = stockData.brands.map((stockBrand: any) => {
      const brandConfig = brands.find(b => b.id === stockBrand.id);
      
      const availableProducts = stockBrand.products.map((product: any) => {
        const availableFlavors = product.flavors
          .filter((f: any) => f.stock > 0)
          .map((flavor: any) => {
            // หารูปภาพจาก brands.ts
            const flavorConfig = brandConfig?.flavors.find(f => f.id === flavor.id);
            
            return {
              id: flavor.id,
              stock_quantity: flavor.stock,
              flavor: {
                id: flavor.id,
                name: flavor.name,
                name_th: flavor.nameTh,
                color: flavor.color,
                image: flavorConfig?.image || null
              }
            };
          });
        
        return {
          id: product.id,
          name: product.name,
          name_th: product.nameTh,
          price: product.price,
          sale_price: product.salePrice,
          puff_count: product.puffCount,
          image_url: brandConfig?.banner || null,
          availableFlavors
        };
      }).filter((p: any) => p.availableFlavors.length > 0);
      
      return {
        brand: {
          id: stockBrand.id,
          name: stockBrand.name,
          name_th: stockBrand.nameTh,
          color: stockBrand.color,
          banner_url: brandConfig?.banner || null
        },
        products: availableProducts
      };
    }).filter((b: any) => b.products.length > 0);
    
    return NextResponse.json({
      success: true,
      data: availableBrands,
      lastUpdated: stockData.lastUpdated
    });
  } catch (error) {
    console.error('Error reading stock file:', error);
    return NextResponse.json({
      success: false,
      error: 'ไม่สามารถอ่านข้อมูลได้',
      data: [],
      lastUpdated: new Date().toISOString()
    }, { status: 500 });
  }
}
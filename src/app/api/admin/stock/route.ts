import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const STOCK_FILE = path.join(process.cwd(), 'src/data/stock.json');

// GET - อ่านข้อมูล stock
export async function GET() {
  try {
    const fileContents = fs.readFileSync(STOCK_FILE, 'utf8');
    const stockData = JSON.parse(fileContents);
    
    return NextResponse.json({
      success: true,
      data: stockData.brands,
      lastUpdated: stockData.lastUpdated
    });
  } catch (error) {
    console.error('Error reading stock file:', error);
    return NextResponse.json({
      success: false,
      error: 'ไม่สามารถอ่านข้อมูลได้'
    }, { status: 500 });
  }
}

// POST - บันทึกข้อมูล stock
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const stockData = {
      lastUpdated: new Date().toISOString(),
      brands: body.brands
    };
    
    fs.writeFileSync(STOCK_FILE, JSON.stringify(stockData, null, 2));
    
    return NextResponse.json({
      success: true,
      message: 'บันทึกข้อมูลสำเร็จ',
      lastUpdated: stockData.lastUpdated
    });
  } catch (error) {
    console.error('Error writing stock file:', error);
    return NextResponse.json({
      success: false,
      error: 'ไม่สามารถบันทึกข้อมูลได้'
    }, { status: 500 });
  }
}

// PUT - อัปเดต stock ของ flavor เดียว
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { brandId, productId, flavorId, stock } = body;
    
    // อ่านข้อมูลปัจจุบัน
    const fileContents = fs.readFileSync(STOCK_FILE, 'utf8');
    const stockData = JSON.parse(fileContents);
    
    // หาและอัปเดต stock
    const brandIndex = stockData.brands.findIndex((b: any) => b.id === brandId);
    if (brandIndex === -1) {
      return NextResponse.json({
        success: false,
        error: 'ไม่พบแบรนด์'
      }, { status: 404 });
    }
    
    const productIndex = stockData.brands[brandIndex].products.findIndex(
      (p: any) => p.id === productId
    );
    if (productIndex === -1) {
      return NextResponse.json({
        success: false,
        error: 'ไม่พบสินค้า'
      }, { status: 404 });
    }
    
    const flavorIndex = stockData.brands[brandIndex].products[productIndex].flavors.findIndex(
      (f: any) => f.id === flavorId
    );
    if (flavorIndex === -1) {
      return NextResponse.json({
        success: false,
        error: 'ไม่พบรสชาติ'
      }, { status: 404 });
    }
    
    // อัปเดต stock
    stockData.brands[brandIndex].products[productIndex].flavors[flavorIndex].stock = stock;
    stockData.lastUpdated = new Date().toISOString();
    
    // บันทึกกลับ
    fs.writeFileSync(STOCK_FILE, JSON.stringify(stockData, null, 2));
    
    return NextResponse.json({
      success: true,
      message: 'อัปเดต stock สำเร็จ',
      lastUpdated: stockData.lastUpdated
    });
  } catch (error) {
    console.error('Error updating stock:', error);
    return NextResponse.json({
      success: false,
      error: 'ไม่สามารถอัปเดตข้อมูลได้'
    }, { status: 500 });
  }
}
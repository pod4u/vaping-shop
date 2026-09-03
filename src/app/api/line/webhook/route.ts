// LINE Webhook Handler
// ใช้สำหรับรับข้อความจาก LINE และตอบกลับ

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { fuzzySearchProducts, getAvailableProducts, parseQuantity } from '@/lib/fuzzy-search';
import { sendReply } from '@/lib/line-client';

// Webhook Handler
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-line-signature');
    if (!verifyLineSignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    const body = JSON.parse(rawBody);

    const events = body.events || [];

    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        await handleMessage(event);
      } else if (event.type === 'postback') {
        await handlePostback(event);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

function verifyLineSignature(body: string, signature: string | null): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac('sha256', secret).update(body).digest('base64');
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

// Handle text message
async function handleMessage(event: any) {
  const userId = event.source.userId;
  const message = event.message.text;
  const replyToken = event.replyToken;

  console.log(`Message from ${userId}: ${message}`);

  // เก็บ userId ลง database (TODO: เชื่อม Supabase)
  // await saveUserId(userId);

  // ตรวจสอบคำสั่ง
  if (message.includes('สั่ง') || message.includes('ซื้อ') || message.includes('เอา')) {
    // ค้นหาสินค้า
    const products = await fuzzySearchProducts(message, 4);
    const quantity = parseQuantity(message);

    if (products.length > 0) {
      // ส่ง Quick Reply ให้เลือก
      await replyWithQuickReply(replyToken, products, quantity);
    } else {
      // ไม่เจอสินค้า
      await replyMessage(replyToken,
        '❌ ไม่พบสินค้าที่ค้นหา\n\n' +
        'กรุณาระบุชื่อสินค้าให้ชัดเจน\n' +
        'เช่น "Marbo Blueberry 2 ตัว"'
      );
    }
  } else if (message.includes('พร้อมส่ง') || message.includes('stock') || message.includes('สต็อก')) {
    // แสดงสินค้าพร้อมส่ง
    await replyWithProductList(replyToken);
  } else if (message.includes('ราคา')) {
    // แสดงราคา
    await replyWithPriceList(replyToken);
  } else {
    // ตอบกลับปกติ
    await replyMessage(replyToken,
      '👋 สวัสดีครับ!\n\n' +
      '📌 วิธีสั่งซื้อ:\n' +
      '• พิมพ์ชื่อสินค้า เช่น "Marbo Blueberry 2 ตัว"\n' +
      '• พิมพ์ "พร้อมส่ง" เพื่อดูสินค้าที่มี\n' +
      '• พิมพ์ "ราคา" เพื่อดูราคา\n\n' +
      '🌐 หรือสั่งผ่านเว็บได้ที่\n' +
      'https://vaping-shop.com'
    );
  }
}

// Handle postback (เมื่อกดปุ่ม)
async function handlePostback(event: any) {
  const userId = event.source.userId;
  const data = event.postback.data;
  const replyToken = event.replyToken;

  console.log(`Postback from ${userId}: ${data}`);

  // Parse data: order:product-id:quantity
  const [action, productId, quantityStr] = data.split(':');

  if (action === 'order') {
    const quantity = parseInt(quantityStr) || 1;

    // TODO: ตัดสต็อก
    // await deductStock(productId, quantity);

    // TODO: สร้างออเดอร์
    // const order = await createOrder(userId, productId, quantity);

    await replyMessage(replyToken,
      `✅ ยืนยันออเดอร์สำเร็จ!\n\n` +
      `📦 สินค้า: ${productId}\n` +
      `🔢 จำนวน: ${quantity} ตัว\n\n` +
      `รอเจ้าหน้าที่ติดต่อกลับครับ 🙏`
    );
  }
}

// Reply with Quick Reply
async function replyWithQuickReply(
  replyToken: string,
  products: any[],
  quantity: number
) {
  const message = {
    type: 'text',
    text: `🔍 พบ ${products.length} รายการที่ใกล้เคียง:\n\nเลือกสินค้าที่ต้องการ:`,
    quickReply: {
      items: products.slice(0, 4).map((p) => ({
        type: 'action',
        action: {
          type: 'postback',
          label: `${p.brandNameTh} ${p.flavorNameTh}`.slice(0, 20),
          data: `order:${p.id}:${quantity}`,
          displayText: `${p.brandNameTh} ${p.flavorNameTh} ${quantity} ตัว`
        }
      }))
    }
  };

  await sendReply(replyToken, message);
}

// Reply with product list
async function replyWithProductList(replyToken: string) {
  const products = await getAvailableProducts(10);

  const message = {
    type: 'text',
    text: '📦 สินค้าพร้อมส่ง:\n\n' +
      products.map(p => `• ${p.brandNameTh} ${p.flavorNameTh} - ฿${p.price}`).join('\n') +
      '\n\nเลือกได้เลยครับ!'
  };

  await sendReply(replyToken, message);
}

// Reply with price list
async function replyWithPriceList(replyToken: string) {
  const products = await getAvailableProducts(100);
  const prices = new Map<string, number>();
  for (const product of products) prices.set(product.brandNameTh, product.price);
  const message = {
    type: 'text',
    text: '💰 ราคาสินค้า:\n\n' +
      [...prices.entries()].map(([brand, price]) => `• ${brand} - ฿${price}`).join('\n') +
      '\n\nสอบถามรสชาติและสต็อกเพิ่มเติมได้เลยครับ'
  };

  await sendReply(replyToken, message);
}

// Reply message
async function replyMessage(replyToken: string, text: string) {
  const message = {
    type: 'text',
    text
  };

  await sendReply(replyToken, message);
}

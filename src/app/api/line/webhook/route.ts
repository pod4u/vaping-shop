// LINE Webhook Handler
// ใช้สำหรับรับข้อความจาก LINE และตอบกลับ

import { NextRequest, NextResponse } from 'next/server';
import { fuzzySearchProducts, parseQuantity } from '@/lib/fuzzy-search';

// LINE API Configuration
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || '';

// Webhook Handler
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Verify signature (security)
    // TODO: Add signature verification

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
    const products = fuzzySearchProducts(message, 4);
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
          label: `${p.brandNameTh} ${p.flavorNameTh}`,
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
  const products = fuzzySearchProducts('marbo mood alfa vplus', 6);

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
  const message = {
    type: 'text',
    text:
      '💰 ราคาสินค้า:\n\n' +
      '• Marbo - ฿250 (ปกติ ฿280)\n' +
      '• Mood - ฿290 (ปกติ ฿320)\n' +
      '• Alfa - ฿450\n' +
      '• Vplus - ฿380\n' +
      '• Eskobar - ฿480\n' +
      '• Mbar - ฿350\n' +
      '• Relx - ฿450\n\n' +
      '🔥 สมาชิกลดเพิ่ม 10 บาท/ออเดอร์!'
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

// Send reply to LINE
async function sendReply(replyToken: string, message: any) {
  try {
    const response = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        replyToken,
        messages: [message]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('LINE API error:', error);
    }
  } catch (error) {
    console.error('Failed to send reply:', error);
  }
}

// Push message to user
export async function pushMessage(userId: string, message: any) {
  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        to: userId,
        messages: [message]
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to push message:', error);
    return false;
  }
}

// Broadcast to all users
export async function broadcastMessage(message: any) {
  try {
    const response = await fetch('https://api.line.me/v2/bot/message/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        messages: [message]
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to broadcast:', error);
    return false;
  }
}
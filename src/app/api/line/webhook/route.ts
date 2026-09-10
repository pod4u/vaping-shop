// LINE Webhook Handler
// ใช้สำหรับรับข้อความจาก LINE และตอบกลับ

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { fuzzySearchProducts, getAvailableProducts, parseQuantity } from '@/lib/fuzzy-search';
import { sendReply } from '@/lib/line-client';
import { OrderPaymentError, processLinePaymentSlip } from '@/lib/order-payment-service';
import { verifyLineIdentityLinkCode } from '@/lib/customer-identity-service';
import { extractLineLinkCode, parseLineProviderUserId } from '@/lib/customer-validation';
import { LineOrderParseError, parseLineOrderSummary } from '@/lib/line-order-parser';
import { confirmLineDraftOrder, createLineDraftOrder, LineOrderIntakeError } from '@/lib/line-order-intake';
import {
  buildAutomationMenuMessage,
  buildGreetingMessage,
  includesAny,
  isCancellationQuestion,
  isDispatchScheduleQuestion,
  isExplicitProductOrder,
  isGenericMarboFamilyQuestion,
  isGreeting,
  isOrderHelpQuestion,
  isPaymentQuestion,
  isProductAvailabilityQuestion,
  isShippingQuestion,
  isStoreHoursQuestion,
  isTrackingQuestion,
  MEMBER_LIFF_URL,
  shouldHandOffImageWithoutReply,
} from '@/lib/line-automation';
import {
  createLineRegistrationSession,
  getLineSalesContext,
  getLineOrderStatus,
} from '@/lib/line-registration-service';

interface RequestMetadata {
  ipAddress: string | null;
  userAgent: string | null;
}

type SalesContext = Awaited<ReturnType<typeof getLineSalesContext>> | null;

// Webhook Handler
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    if (rawBody.length > 1_000_000) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }
    const signature = req.headers.get('x-line-signature');
    if (!verifyLineSignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    const body = JSON.parse(rawBody);

    const events = Array.isArray(body.events) ? body.events.slice(0, 100) : [];
    const destination = typeof body.destination === 'string' ? body.destination : '';
    const metadata: RequestMetadata = {
      ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim().slice(0, 64) || null,
      userAgent: req.headers.get('user-agent')?.slice(0, 500) || null,
    };

    for (const event of events) {
      if (event?.mode === 'standby') continue;
      if (event.type === 'message' && event.message.type === 'text') {
        await handleMessage(event, destination, metadata);
      } else if (event.type === 'message' && event.message.type === 'image') {
        await handlePaymentSlip(event, destination);
      } else if (event.type === 'postback') {
        await handlePostback(event, destination, metadata);
      } else if (event.type === 'follow') {
        await replyWithAutomationMenu(event.replyToken);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

async function handlePaymentSlip(event: any, destination: string) {
  const replyToken = event.replyToken;
  if (event.source?.type !== 'user') {
    await replyMessage(replyToken, 'กรุณาส่งสลิปในแชทส่วนตัวกับ LINE OA เท่านั้นค่ะ');
    return;
  }

  try {
    const result = await processLinePaymentSlip({
      providerAccountId: parseLineProviderUserId(destination),
      providerUserId: parseLineProviderUserId(event.source?.userId),
      messageId: String(event.message?.id ?? ''),
    });
    await replyMessage(
      replyToken,
      `✅ ตรวจสอบการชำระเงินเรียบร้อย\n\nเลขที่ ${result.orderNumber}\nยอด ฿${result.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}\nระบบยืนยันออเดอร์ให้เรียบร้อยแล้ว\n\nเลข Tracking พัสดุจะสามารถเข้าไปเช็กได้ในระบบสมาชิกวันพรุ่งนี้นะคะ\nhttps://liff.line.me/2011511843-ReAPLsJH`,
    );
  } catch (error) {
    if (error instanceof OrderPaymentError) {
      // An image is not necessarily a payment slip. If this LINE account has no
      // active payment waiting for a slip, leave the image for the admin instead
      // of replying with an unrelated member/payment error on every photo.
      if (shouldHandOffImageWithoutReply(error.code)) {
        console.log('LINE image handed off to admin without automatic reply');
        return;
      }
      const messages: Record<string, string> = {
        NO_ACTIVE_PAYMENT: 'ยังไม่มีออเดอร์ที่รอรับสลิป กรุณากดยืนยันสต๊อกจากข้อความออเดอร์ก่อนนะคะ',
        LINE_IDENTITY_NOT_FOUND: 'LINE นี้ยังไม่ได้เชื่อมสมาชิก กรุณาสมัคร/เชื่อมสมาชิกก่อนค่ะ',
        SLIP_DUPLICATE: 'สลิปนี้ถูกใช้แล้ว ออเดอร์จึงยังไม่ได้รับการยืนยัน กรุณาติดต่อเจ้าหน้าที่นะคะ',
        RECEIVER_MISMATCH: 'บัญชีผู้รับในสลิปไม่ตรงกับร้าน ออเดอร์จึงยังไม่ได้รับการยืนยันนะคะ',
        AMOUNT_MISMATCH: 'ยอดในสลิปไม่ตรงกับยอดออเดอร์ ออเดอร์จึงยังไม่ได้รับการยืนยันนะคะ',
        SLIP_PENDING: 'ธนาคารยังประมวลผลสลิปไม่เสร็จ กรุณารอสักครู่แล้วส่งสลิปอีกครั้งค่ะ',
        SLIP_NOT_FOUND: 'ไม่พบ QR ในรูป กรุณาส่งภาพสลิปที่เห็น QR ชัดเจนค่ะ',
        INVALID_API_KEY: 'ยังไม่สามารถตรวจสอบการชำระเงินได้ในขณะนี้ กรุณาติดต่อเจ้าหน้าที่นะคะ',
        IP_NOT_ALLOWED: 'ยังไม่สามารถตรวจสอบการชำระเงินได้ในขณะนี้ กรุณาติดต่อเจ้าหน้าที่นะคะ',
        BRANCH_INACTIVE: 'ยังไม่สามารถตรวจสอบการชำระเงินได้ในขณะนี้ กรุณาติดต่อเจ้าหน้าที่นะคะ',
        QUOTA_EXCEEDED: 'ยังไม่สามารถตรวจสอบการชำระเงินได้ในขณะนี้ กรุณาติดต่อเจ้าหน้าที่นะคะ',
      };
      await replyMessage(
        replyToken,
        messages[error.code] ?? 'ตรวจสอบสลิปไม่สำเร็จ ออเดอร์ยังไม่ได้รับการยืนยัน กรุณาส่งภาพสลิปที่ชัดเจนหรือติดต่อเจ้าหน้าที่นะคะ',
      );
      return;
    }
    const message = error instanceof Error ? error.message : '';
    if (message.includes('payment reservation expired') || message.includes('not active')) {
      await replyMessage(replyToken, 'เวลาจองสินค้าหมดแล้ว ออเดอร์ยังไม่ได้รับการยืนยัน กรุณาติดต่อเจ้าหน้าที่เพื่อเช็กสต๊อกใหม่อีกครั้งนะคะ');
      return;
    }
    console.error('LINE payment slip processing failed');
    await replyMessage(replyToken, 'ระบบตรวจสลิปขัดข้องชั่วคราว ออเดอร์ยังไม่ได้รับการยืนยัน กรุณาติดต่อเจ้าหน้าที่นะคะ');
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
async function handleMessage(
  event: any,
  destination: string,
  metadata: RequestMetadata,
) {
  const userId = event.source?.userId;
  const message = typeof event.message?.text === 'string' ? event.message.text : '';
  const replyToken = event.replyToken;
  const normalizedMessage = message.trim().toLowerCase();

  // Log only event type, not user data or message content
  console.log('Received LINE message event');

  if (
    normalizedMessage === 'สมัครสมาชิก'
    || normalizedMessage === 'เชื่อมสมาชิก'
    || normalizedMessage === 'สมัคร/เชื่อมสมาชิก'
    || normalizedMessage === 'เข้าสู่ระบบสมาชิก'
  ) {
    await replyWithRegistrationStart(event, destination, metadata);
    return;
  }

  if (
    normalizedMessage === 'ต้องการสั่งซื้อสินค้า'
    || normalizedMessage === 'สั่งซื้อสินค้า'
    || normalizedMessage === 'วิธีสั่งซื้อ'
  ) {
    await replyWithOrderGuide(replyToken, await resolveSalesContext(event, destination));
    return;
  }

  if (normalizedMessage === 'เช็กสถานะออเดอร์' || normalizedMessage === 'สถานะออเดอร์') {
    await replyWithOrderStatus(event, destination);
    return;
  }

  if (normalizedMessage === 'ติดต่อแอดมิน' || normalizedMessage.startsWith('แอดมิน')) {
    await replyMessage(
      replyToken,
      '💬 รับข้อความสำหรับเจ้าหน้าที่แล้วค่ะ\n\nลูกค้าต้องการให้ช่วยเรื่องสินค้า การชำระเงิน หรือการจัดส่งคะ พิมพ์รายละเอียดต่อในแชทนี้ได้เลย โดยไม่ต้องส่งข้อมูลส่วนตัวซ้ำค่ะ',
    );
    return;
  }

  if (isShippingQuestion(normalizedMessage)) {
    await replyWithSalesPrompt(
      replyToken,
      '🚚 ค่าจัดส่งทั่วไทย 50 บาทค่ะ\nเฉพาะสินค้าดูดแล้วทิ้ง สั่งตั้งแต่ 3 ชิ้นขึ้นไป ส่งฟรี ส่วนรายการอื่นคิดค่าส่ง 50 บาทค่ะ',
      await resolveSalesContext(event, destination),
      'ลูกค้ากำลังสนใจรุ่นไหนและต้องการกี่ชิ้นคะ',
      'stock',
    );
    return;
  }

  if (isDispatchScheduleQuestion(normalizedMessage)) {
    await replyWithSalesPrompt(
      replyToken,
      '📦 รอบจัดส่งสินค้า\n\n• ชำระเงินและส่งสลิปภายใน 15:00 น. จัดส่งภายในวันนั้น\n• หลัง 15:00 น. จัดส่งในวันถัดไป\n\nร้านเปิดให้บริการทุกวัน ไม่มีวันหยุดค่ะ',
      await resolveSalesContext(event, destination),
      'ต้องการเลือกสินค้าให้ทันรอบจัดส่งวันนี้เลยไหมคะ',
      'stock',
    );
    return;
  }

  if (isStoreHoursQuestion(normalizedMessage)) {
    await replyWithSalesPrompt(
      replyToken,
      'ร้านเปิดให้บริการทุกวัน ไม่มีวันหยุดค่ะ\nรับรายการสั่งซื้อได้ตลอด 24 ชั่วโมง และตัดรอบจัดส่งเวลา 15:00 น.',
      await resolveSalesContext(event, destination),
      'วันนี้ลูกค้ากำลังมองหาแบรนด์หรือรสไหนอยู่คะ',
      'stock',
    );
    return;
  }

  if (isPaymentQuestion(normalizedMessage)) {
    await replyWithSalesPrompt(
      replyToken,
      '💳 วิธีชำระเงิน\n\nหลังยืนยันและจองสต๊อก ระบบจะส่งยอดและบัญชีรับชำระในแชทนี้โดยอัตโนมัติ กรุณารอข้อความดังกล่าวแล้วโอนยอดให้ตรง จากนั้นส่งรูปสลิปในแชทค่ะ',
      await resolveSalesContext(event, destination),
      'ลูกค้ามีออเดอร์ที่รอชำระอยู่ หรือต้องการเลือกสินค้าก่อนคะ',
      'orders',
    );
    return;
  }

  if (isTrackingQuestion(normalizedMessage)) {
    await replyWithSalesPrompt(
      replyToken,
      '📦 เลขพัสดุจะแสดงในระบบสมาชิกหลังร้านบันทึกการจัดส่งค่ะ ลูกค้าสามารถกลับมาเช็กสถานะได้เองโดยไม่ต้องแจ้งเลขออเดอร์ซ้ำ',
      await resolveSalesContext(event, destination),
      'ต้องการเปิดหน้าออเดอร์เพื่อตรวจสอบตอนนี้เลยไหมคะ',
      'orders',
    );
    return;
  }

  if (isCancellationQuestion(normalizedMessage)) {
    await replyWithSalesPrompt(
      replyToken,
      'ยกเลิกออเดอร์ที่ยังไม่ชำระได้จากระบบสมาชิกค่ะ หากระบบตรวจสอบการชำระเงินเรียบร้อยแล้ว กรุณาติดต่อเจ้าหน้าที่',
      await resolveSalesContext(event, destination),
      'ต้องการเปิดหน้าออเดอร์เพื่อตรวจสอบและยกเลิกเลยไหมคะ',
      'orders',
    );
    return;
  }

  const linkCode = extractLineLinkCode(message);
  if (linkCode) {
    if (event.source?.type !== 'user') {
      await replyMessage(replyToken, 'กรุณาส่งรหัสยืนยันในแชทส่วนตัวกับ LINE OA เท่านั้นค่ะ');
      return;
    }
    try {
      const providerUserId = parseLineProviderUserId(userId);
      const providerAccountId = parseLineProviderUserId(destination);
      const result = await verifyLineIdentityLinkCode({
        providerAccountId,
        providerUserId,
        code: linkCode,
      });

      if (result === 'verified') {
        const memberSession = await createLineRegistrationSession({
          providerAccountId,
          providerUserId,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
        });
        if (memberSession.status !== 'already_linked') {
          throw new Error('Verified LINE identity could not start a member session');
        }
        await replyWithMemberAccess(replyToken, memberSession.memberAccessUrl);
      } else {
        await replyMessage(
          replyToken,
          'ไม่สามารถยืนยันได้ รหัสอาจไม่ถูกต้อง หมดอายุ หรือถูกระงับ กรุณาติดต่อเจ้าหน้าที่ค่ะ',
        );
      }
    } catch {
      console.error('LINE identity linking verification failed');
      await replyMessage(
        replyToken,
        'ระบบยืนยันสมาชิกขัดข้องชั่วคราว กรุณาติดต่อเจ้าหน้าที่ค่ะ',
      );
    }
    return;
  }

  try {
    const orderItems = parseLineOrderSummary(message);
    if (orderItems) {
      if (event.source?.type !== 'user') {
        await replyMessage(replyToken, 'กรุณาส่งรายการสั่งซื้อในแชทส่วนตัวกับ LINE OA เท่านั้นค่ะ');
        return;
      }

      const providerUserId = parseLineProviderUserId(userId);
      const providerAccountId = parseLineProviderUserId(destination);
      const eventId = parseWebhookEventId(event.webhookEventId, event.message?.id);
      const result = await createLineDraftOrder({
        providerAccountId,
        providerUserId,
        webhookEventId: `line:${providerAccountId}:${eventId}`,
        items: orderItems,
      });

      await replyWithDraftOrder(replyToken, result);
      return;
    }
  } catch (error) {
    if (error instanceof LineOrderParseError) {
      await replyMessage(replyToken, `ไม่สามารถอ่านรายการได้: ${error.message}\nกรุณาคัดลอกรายการใหม่จากหน้าเว็บค่ะ`);
      return;
    }
    if (error instanceof LineOrderIntakeError) {
      await replyMessage(replyToken, lineOrderIntakeErrorMessage(error.reason));
      return;
    }

    const databaseCode = error && typeof error === 'object' && 'code' in error
      ? String(error.code)
      : '';
    if (databaseCode === 'P0002' || databaseCode === '23503') {
      await replyMessage(replyToken, 'สินค้า สมาชิก หรือที่อยู่ไม่พร้อมใช้งาน กรุณาติดต่อเจ้าหน้าที่ค่ะ');
      return;
    }
    throw error;
  }

  if (isOrderHelpQuestion(normalizedMessage)) {
    await replyWithOrderGuide(replyToken, await resolveSalesContext(event, destination));
  } else if (isGenericMarboFamilyQuestion(normalizedMessage)) {
    const products = await getAvailableProducts(100);
    await replyWithMarboFamilyChoice(replyToken, products, await resolveSalesContext(event, destination));
  } else if (isProductAvailabilityQuestion(normalizedMessage)) {
    const products = await fuzzySearchProducts(message, 8);
    await replyWithProductAvailability(replyToken, products, await resolveSalesContext(event, destination));
  } else if (isExplicitProductOrder(normalizedMessage)) {
    // ค้นหาสินค้า
    const products = await fuzzySearchProducts(message, 4);
    const quantity = parseQuantity(message);

    if (products.length > 0) {
      // ส่ง Quick Reply ให้เลือก
      await replyWithQuickReply(
        replyToken,
        products,
        quantity,
        await resolveSalesContext(event, destination),
      );
    } else {
      await replyWithOrderGuide(replyToken, await resolveSalesContext(event, destination));
    }
  } else if (includesAny(normalizedMessage, ['พร้อมส่ง', 'stock', 'สต็อก'])) {
    // แสดงสินค้าพร้อมส่ง
    await replyWithProductList(replyToken, await resolveSalesContext(event, destination));
  } else if (message.includes('ราคา')) {
    // แสดงราคา
    await replyWithPriceList(replyToken, await resolveSalesContext(event, destination));
  } else if (isGreeting(normalizedMessage)) {
    await replyWithGreeting(event, destination);
  } else {
    // คำถามเฉพาะสินค้า/บทสนทนาทั่วไปให้เจ้าหน้าที่ตอบเอง
    // การไม่ส่ง fallback ซ้ำช่วยให้แชทอ่านง่ายและไม่รบกวนลูกค้า
    console.log('LINE message handed off to admin without automatic reply');
  }
}

// Handle postback (เมื่อกดปุ่ม)
async function handlePostback(
  event: any,
  destination: string,
  metadata: RequestMetadata,
) {
  const userId = event.source?.userId;
  const data = typeof event.postback?.data === 'string' ? event.postback.data : '';
  const replyToken = event.replyToken;

  // Log only event type, not user data
  console.log('Received LINE postback event');

  if (data === 'action=membership_start') {
    await replyWithRegistrationStart(event, destination, metadata);
    return;
  }
  if (data === 'action=membership_existing') {
    await replyMessage(
      replyToken,
      '🔐 เชื่อมสมาชิกเดิม\n\nกรุณาแจ้งแอดมินให้สร้างรหัสยืนยัน 6 หลักโดยตรวจจากเบอร์เดิมในระบบ แล้วส่งเฉพาะรหัส 6 หลักกลับมาในแชทนี้\n\nเชื่อมสำเร็จแล้ว ระบบจะส่งปุ่ม “เปิดหน้าสมาชิก” ให้ทันที และครั้งต่อไปไม่ต้องสมัครใหม่ค่ะ',
    );
    return;
  }
  if (data === 'action=order_status') {
    await replyWithOrderStatus(event, destination);
    return;
  }
  if (data === 'action=order_help') {
    await replyWithOrderGuide(replyToken, await resolveSalesContext(event, destination));
    return;
  }
  if (data === 'action=support') {
    await replyMessage(
      replyToken,
      '💬 ติดต่อเจ้าหน้าที่\n\nพิมพ์คำถามต่อในแชทนี้ได้เลย หากเป็นเรื่องข้อมูลส่วนตัว กรุณาไม่ส่งชื่อเต็ม เบอร์โทร หรือที่อยู่ซ้ำ เจ้าหน้าที่จะตรวจจากสมาชิกที่เชื่อมไว้ให้ค่ะ',
    );
    return;
  }

  if (data.startsWith('action=confirm_stock&')) {
    if (event.source?.type !== 'user') {
      await replyMessage(replyToken, 'กรุณายืนยันออเดอร์ในแชทส่วนตัวกับ LINE OA เท่านั้นนะคะ');
      return;
    }

    const orderId = new URLSearchParams(data).get('orderId') ?? '';
    try {
      const result = await confirmLineDraftOrder({
        providerAccountId: parseLineProviderUserId(destination),
        providerUserId: parseLineProviderUserId(userId),
        orderId,
      });
      await replyMessage(
        replyToken,
        result.payment.notificationSent
          ? `✅ เช็กและจองสต๊อกออเดอร์ ${result.orderNumber} เรียบร้อยแล้ว\nระบบส่งยอดและข้อมูลชำระเงินให้ในแชทนี้แล้ว กรุณาโอนและส่งรูปสลิปนะคะ`
          : `เช็กและจองสต๊อกออเดอร์ ${result.orderNumber} แล้ว แต่ส่งข้อมูลชำระเงินไม่สำเร็จ กรุณาติดต่อเจ้าหน้าที่นะคะ`,
      );
    } catch (error) {
      const value = error && typeof error === 'object' ? error as { code?: unknown; message?: unknown } : {};
      const code = typeof value.code === 'string' ? value.code : '';
      const message = typeof value.message === 'string' ? value.message : '';
      if (error instanceof LineOrderIntakeError) {
        await replyMessage(replyToken, lineOrderIntakeErrorMessage(error.reason));
      } else if (code === 'P0001' || message.includes('insufficient stock')) {
        await replyMessage(replyToken, 'ขออภัย มีสินค้าบางรายการไม่เพียงพอ กรุณากลับไปแก้ไขหรือยกเลิกออเดอร์ในระบบสมาชิกนะคะ');
      } else if (code === '55000') {
        await replyMessage(replyToken, 'ออเดอร์นี้ถูกยืนยันแล้ว หมดเวลาจอง หรือไม่พร้อมรับชำระเงิน กรุณาเช็กสถานะในระบบสมาชิกนะคะ');
      } else {
        console.error('Customer stock confirmation failed', { code });
        await replyMessage(replyToken, 'ระบบเช็กสต๊อกขัดข้องชั่วคราว กรุณาลองกดอีกครั้งหรือติดต่อเจ้าหน้าที่นะคะ');
      }
    }
    return;
  }

  // Parse data: order:product-id:quantity
  const [action, productId, quantityStr] = data.split(':');

  if (action === 'order') {
    const quantity = Number.parseInt(quantityStr, 10) || 1;
    if (event.source?.type !== 'user' || !isSafeProductIdentifier(productId) || quantity < 1 || quantity > 999) {
      await replyMessage(replyToken, 'รายการไม่ถูกต้อง กรุณาเลือกสินค้าใหม่ในแชทส่วนตัวค่ะ');
      return;
    }

    try {
      const providerUserId = parseLineProviderUserId(userId);
      const providerAccountId = parseLineProviderUserId(destination);
      const eventId = parseWebhookEventId(event.webhookEventId, event.postback?.data);
      const result = await createLineDraftOrder({
        providerAccountId,
        providerUserId,
        webhookEventId: `line:${providerAccountId}:${eventId}`,
        items: [{ identifier: productId, quantity }],
      });
      await replyWithDraftOrder(replyToken, result);
    } catch (error) {
      if (error instanceof LineOrderIntakeError) {
        await replyMessage(replyToken, lineOrderIntakeErrorMessage(error.reason));
        return;
      }
      throw error;
    }
  }
}

async function replyWithDraftOrder(
  replyToken: string,
  draft: Awaited<ReturnType<typeof createLineDraftOrder>>,
) {
  const { orderId, orderNumber, confirmation } = draft;
  const inlineItems = confirmation.items.slice(0, 12);
  const itemLines = inlineItems.map((item, index) => (
    `${index + 1}. ${item.brand_name} · ${item.product_name} · ${item.flavor_name}\n   ${item.quantity} ชิ้น × ฿${Number(item.unit_price).toLocaleString("th-TH")}`
  ));
  if (confirmation.items.length > inlineItems.length) {
    itemLines.push(`…อีก ${confirmation.items.length - inlineItems.length} รายการ กรุณากดดูรายการทั้งหมดในระบบสมาชิก`);
  }
  const address = [confirmation.shipping_address, confirmation.shipping_province, confirmation.shipping_postal_code]
    .filter(Boolean)
    .join(" ");
  await sendReply(replyToken, {
    type: 'text',
    text: `✅ รับออเดอร์แล้ว\n\nเลขที่ ${orderNumber}\n\n🛍️ รายการสินค้า\n${itemLines.join("\n")}\n\nยอดรวม ฿${Number(confirmation.total).toLocaleString("th-TH", { minimumFractionDigits: 2 })}\n\n📍 ข้อมูลจัดส่ง\nผู้รับ: ${confirmation.shipping_name}\nโทร: ${confirmation.shipping_phone}\nที่อยู่: ${address}\n\nกรุณาตรวจสินค้า เบอร์โทร และที่อยู่ให้ถูกต้องก่อนกดยืนยันนะคะ หากข้อมูลไม่ถูกต้อง ให้กด “ดูหรือแก้ไขออเดอร์” ก่อนค่ะ`,
    quickReply: {
      items: [
        {
          type: 'action',
          action: {
            type: 'postback',
            label: 'ข้อมูลถูกต้อง ยืนยัน',
            data: `action=confirm_stock&orderId=${orderId}`,
            displayText: `ยืนยันข้อมูลออเดอร์ ${orderNumber}`,
          },
        },
        {
          type: 'action',
          action: {
            type: 'uri',
            label: 'ดูหรือแก้ไขออเดอร์',
            uri: 'https://liff.line.me/2011511843-ReAPLsJH?next=orders',
          },
        },
      ],
    },
  });
}

async function replyWithRegistrationStart(
  event: any,
  destination: string,
  metadata: RequestMetadata,
) {
  const replyToken = event.replyToken;
  if (event.source?.type !== 'user') {
    await replyMessage(replyToken, 'กรุณาสมัครสมาชิกในแชทส่วนตัวกับ LINE OA เท่านั้นค่ะ');
    return;
  }

  try {
    const providerUserId = parseLineProviderUserId(event.source?.userId);
    const providerAccountId = parseLineProviderUserId(destination);
    const result = await createLineRegistrationSession({
      providerAccountId,
      providerUserId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });

    if (result.status === 'already_linked') {
      await replyWithMemberAccess(replyToken, result.memberAccessUrl);
      return;
    }

    await sendReply(replyToken, {
      type: 'template',
      altText: 'เข้าสู่ระบบสมาชิก Pod4U',
      template: {
        type: 'buttons',
        title: 'เข้าสู่ระบบสมาชิก',
        text: 'ลูกค้าใหม่เชื่อมครั้งแรกเพียงครั้งเดียว ลิงก์นี้ใช้ได้ครั้งเดียวและหมดอายุภายใน 10 นาที',
        actions: [
          {
            type: 'uri',
            label: 'เข้าสู่ระบบสมาชิก',
            uri: result.registrationUrl,
          },
          {
            type: 'postback',
            label: 'ฉันเป็นสมาชิกเดิม',
            data: 'action=membership_existing',
            displayText: 'เชื่อมสมาชิกเดิม',
          },
        ],
      },
    });
  } catch (error) {
    console.error('LINE registration start failed', {
      code: error && typeof error === 'object' && 'code' in error ? String(error.code) : 'unknown',
    });
    await replyMessage(
      replyToken,
      'ระบบสมัครสมาชิกขัดข้องชั่วคราว กรุณาลองใหม่หรือติดต่อเจ้าหน้าที่ค่ะ',
    );
  }
}

async function replyWithMemberAccess(replyToken: string, memberAccessUrl: string) {
  await sendReply(replyToken, {
    type: 'template',
    altText: 'เข้าสู่ระบบสมาชิก Pod4U',
    template: {
      type: 'buttons',
      title: '✅ พบข้อมูลสมาชิกแล้ว',
      text: 'เชื่อม LINE กับสมาชิกเรียบร้อย เปิดหน้าสมาชิกได้ทันทีโดยไม่ต้องสมัครใหม่',
      actions: [
        {
          type: 'uri',
          label: 'เปิดหน้าสมาชิก',
          uri: memberAccessUrl,
        },
        {
          type: 'uri',
          label: 'สั่งซื้อสินค้า',
          uri: 'https://www.pod4u.store/stock?source=line',
        },
      ],
    },
  });
}

async function replyWithOrderGuide(replyToken: string, context: SalesContext = null) {
  await sendReply(replyToken, {
    type: 'text',
    text: `🛒 สั่งซื้อกับ Pod4U ง่าย ๆ ค่ะ\n\n1. เข้าสู่ระบบสมาชิกครั้งแรกเพียงครั้งเดียว\n2. เลือกสินค้าพร้อมส่งแล้วเพิ่มลงตะกร้า\n3. ส่งรายการกลับเข้ามาใน LINE และตรวจข้อมูล\n4. ยืนยันออเดอร์ โอนเงิน และส่งสลิปในแชทนี้\n\n${salesContextCopy(context)}\n\nวันนี้ลูกค้ากำลังสนใจแบรนด์หรือรสไหนอยู่คะ`,
    quickReply: {
      items: buildSalesQuickReply(context, 'stock'),
    },
  });
}

async function resolveSalesContext(event: any, destination: string): Promise<SalesContext> {
  if (event.source?.type !== 'user') return null;
  try {
    return await getLineSalesContext({
      providerAccountId: parseLineProviderUserId(destination),
      providerUserId: parseLineProviderUserId(event.source?.userId),
    });
  } catch {
    console.error('LINE sales context lookup failed');
    return null;
  }
}

function salesContextCopy(context: SalesContext): string {
  if (context?.linked && context.hasDefaultAddress) {
    return 'บัญชีสมาชิกและที่อยู่จัดส่งของลูกค้าพร้อมใช้งานแล้วค่ะ ไม่ต้องพิมพ์ข้อมูลส่วนตัวซ้ำ';
  }
  if (context?.linked) {
    return 'บัญชีสมาชิกเชื่อมเรียบร้อยแล้วค่ะ เหลือเพิ่มที่อยู่จัดส่งหลักก่อนยืนยันออเดอร์';
  }
  if (context && !context.linked) {
    return 'ตอนนี้ LINE นี้ยังไม่ได้เชื่อมสมาชิกค่ะ เชื่อมครั้งเดียวแล้วระบบจะจำข้อมูล ออเดอร์ และเลขพัสดุให้';
  }
  return 'เชื่อมสมาชิกครั้งแรกเพียงครั้งเดียว แล้วระบบจะช่วยจำข้อมูล ออเดอร์ และเลขพัสดุให้ค่ะ';
}

function buildSalesQuickReply(context: SalesContext, primary: 'stock' | 'orders') {
  const items: any[] = [];
  if (primary === 'stock') {
    items.push({
      type: 'action',
      action: { type: 'uri', label: 'ดูสินค้าพร้อมส่ง', uri: 'https://www.pod4u.store/stock?source=line-sales' },
    });
  } else if (context?.linked) {
    items.push({
      type: 'action',
      action: { type: 'uri', label: 'เปิดออเดอร์ของฉัน', uri: 'https://liff.line.me/2011511843-ReAPLsJH?next=orders' },
    });
  }
  if (!context?.linked) {
    items.push({
      type: 'action',
      action: { type: 'uri', label: 'เข้าสู่ระบบสมาชิก', uri: MEMBER_LIFF_URL },
    });
  }
  if (primary === 'orders' && !context?.linked) {
    items.push({
      type: 'action',
      action: { type: 'uri', label: 'ดูสินค้าพร้อมส่ง', uri: 'https://www.pod4u.store/stock?source=line-sales' },
    });
  }
  return items;
}

async function replyWithSalesPrompt(
  replyToken: string,
  answer: string,
  context: SalesContext,
  question: string,
  primary: 'stock' | 'orders',
) {
  await sendReply(replyToken, {
    type: 'text',
    text: `${answer}\n\n${salesContextCopy(context)}\n\n${question}`,
    quickReply: { items: buildSalesQuickReply(context, primary) },
  });
}

async function replyWithAutomationMenu(replyToken: string) {
  await sendReply(replyToken, buildAutomationMenuMessage());
}

async function replyWithGreeting(event: any, destination: string) {
  const replyToken = event.replyToken;
  const context = await resolveSalesContext(event, destination);
  await sendReply(replyToken, buildGreetingMessage(context));
}

async function replyWithOrderStatus(event: any, destination: string) {
  const replyToken = event.replyToken;
  if (event.source?.type !== 'user') {
    await replyMessage(replyToken, 'กรุณาตรวจสอบออเดอร์ในแชทส่วนตัวกับ LINE OA เท่านั้นค่ะ');
    return;
  }

  try {
    const result = await getLineOrderStatus({
      providerAccountId: parseLineProviderUserId(destination),
      providerUserId: parseLineProviderUserId(event.source?.userId),
    });
    if (!result.linked) {
      await sendReply(replyToken, {
        type: 'text',
        text: 'ตอนนี้ LINE นี้ยังไม่ได้เชื่อมสมาชิกค่ะ เชื่อมครั้งเดียวแล้วลูกค้าจะดูออเดอร์และเลขพัสดุได้เองโดยไม่ต้องแจ้งข้อมูลซ้ำ\n\nต้องการเข้าสู่ระบบสมาชิกตอนนี้ไหมคะ',
        quickReply: { items: buildSalesQuickReply({ linked: false, hasDefaultAddress: false }, 'orders') },
      });
      return;
    }
    if (result.orders.length === 0) {
      await sendReply(replyToken, {
        type: 'text',
        text: '📦 บัญชีสมาชิกเชื่อมเรียบร้อยแล้วค่ะ แต่ตอนนี้ยังไม่มีออเดอร์\n\nลูกค้าต้องการดูสินค้าพร้อมส่งและเริ่มออเดอร์แรกเลยไหมคะ',
        quickReply: { items: buildSalesQuickReply({ linked: true, hasDefaultAddress: true }, 'stock') },
      });
      return;
    }

    const lines = result.orders.map((order) => {
      const tracking = order.tracking_number
        ? `\n  พัสดุ: ${order.carrier || '-'} ${order.tracking_number}`
        : '';
      return `• ${order.order_number}\n  สถานะ: ${formatOrderStatus(order.status)}${tracking}`;
    });
    await sendReply(replyToken, {
      type: 'text',
      text: `📦 ออเดอร์ล่าสุด\n\n${lines.join('\n\n')}\n\nต้องการเปิดดูรายละเอียดหรือเช็กเลขพัสดุของออเดอร์ไหนคะ`,
      quickReply: { items: buildSalesQuickReply({ linked: true, hasDefaultAddress: true }, 'orders') },
    });
  } catch {
    console.error('LINE order status lookup failed');
    await replyMessage(replyToken, 'ไม่สามารถตรวจสอบออเดอร์ได้ชั่วคราว กรุณาลองใหม่ค่ะ');
  }
}

function formatOrderStatus(status: unknown): string {
  const labels: Record<string, string> = {
    draft: 'รอลูกค้ายืนยันสต๊อก',
    pending: 'จองสินค้า/รอตรวจสลิป',
    confirmed: 'ยืนยันแล้ว',
    shipped: 'จัดส่งแล้ว',
    delivered: 'ส่งถึงแล้ว',
    cancelled: 'ยกเลิก',
  };
  return labels[String(status)] ?? 'กำลังดำเนินการ';
}

function parseWebhookEventId(primary: unknown, fallback: unknown): string {
  if (typeof primary === 'string' && /^[0-9A-HJKMNP-TV-Z]{26}$/i.test(primary)) {
    return primary.toUpperCase();
  }
  if (typeof fallback === 'string' && /^[A-Za-z0-9:_-]{1,40}$/.test(fallback)) {
    return fallback;
  }
  throw new LineOrderIntakeError('event', 'LINE event ID ไม่ถูกต้อง');
}

function isSafeProductIdentifier(value: unknown): value is string {
  return typeof value === 'string'
    && value.length >= 1
    && value.length <= 200
    && !/[\r\n\]]/.test(value);
}

function lineOrderIntakeErrorMessage(reason: LineOrderIntakeError['reason']): string {
  if (reason === 'identity') {
    return 'ยังไม่สามารถรับรายการเข้าระบบได้ กรุณาติดต่อเจ้าหน้าที่เพื่อเชื่อมบัญชีสมาชิกก่อนค่ะ';
  }
  if (reason === 'address') {
    return 'ยังไม่มีที่อยู่จัดส่งหลัก กรุณาเพิ่มหรือยืนยันที่อยู่กับเจ้าหน้าที่ก่อนค่ะ';
  }
  if (reason === 'catalog') {
    return 'มีสินค้าบางรายการที่ระบบระบุไม่ได้ กรุณาคัดลอกรายการใหม่จากหน้าเว็บค่ะ';
  }
  return 'ไม่สามารถตรวจสอบรายการนี้ได้ กรุณาลองใหม่หรือติดต่อเจ้าหน้าที่ค่ะ';
}

// Reply with Quick Reply
async function replyWithQuickReply(
  replyToken: string,
  products: any[],
  quantity: number,
  context: SalesContext,
) {
  const productActions = context?.linked
    ? products.slice(0, 4).map((product) => ({
        type: 'action',
        action: {
          type: 'postback',
          label: `${product.brandNameTh} ${product.flavorNameTh}`.slice(0, 20),
          data: `order:${product.id}:${quantity}`,
          displayText: `${product.brandNameTh} ${product.flavorNameTh} ${quantity} ตัว`,
        },
      }))
    : buildSalesQuickReply(context, 'stock');
  const message = {
    type: 'text',
    text: context?.linked
      ? `🔍 เจอ ${products.length} รายการที่ใกล้เคียงค่ะ\n\n${salesContextCopy(context)}\n\nลูกค้ารับรายการไหน จำนวน ${quantity} ชิ้นดีคะ กดชื่อสินค้าเพื่อส่งออเดอร์ได้เลยค่ะ`
      : `🔍 เจอ ${products.length} รายการที่ใกล้เคียงค่ะ\n\n${salesContextCopy(context)}\n\nเชื่อมสมาชิกก่อนแล้วกลับมาเลือกรายการนี้ได้เลยค่ะ ต้องการเชื่อมตอนนี้ไหมคะ`,
    quickReply: {
      items: productActions,
    }
  };

  await sendReply(replyToken, message);
}

async function replyWithProductAvailability(
  replyToken: string,
  products: Awaited<ReturnType<typeof fuzzySearchProducts>>,
  context: SalesContext,
) {
  if (products.length === 0) {
    await sendReply(replyToken, {
      type: 'text',
      text: `ยังไม่พบชื่อสินค้าหรือรสที่ตรงกันค่ะ ลองพิมพ์ชื่อแบรนด์และรส เช่น “MARBO สตรอว์เบอร์รี มีไหม”\n\n${salesContextCopy(context)}\n\nลูกค้าต้องการเปิดดูสินค้าพร้อมส่งทั้งหมด หรือมีชื่อรุ่นอื่นที่สนใจคะ`,
      quickReply: {
        items: buildSalesQuickReply(context, 'stock'),
      },
    });
    return;
  }

  const available = products.filter((product) => product.stock > 0);
  const lines = available.slice(0, 6).map((product) => (
    `• ${product.brandNameTh || product.brandName} · ${product.productNameTh || product.productName} · ${product.flavorNameTh || product.flavorName}\n  พร้อมส่ง ${product.stock} ชิ้น · ฿${product.price.toLocaleString('th-TH')}`
  ));
  const text = available.length > 0
    ? `✅ มีสินค้าที่ใกล้เคียงพร้อมส่งค่ะ\n\n${lines.join('\n')}\n\n${salesContextCopy(context)}\n\nลูกค้ารับรสไหนดีคะ กดดูสต็อกล่าสุดแล้วเพิ่มลงตะกร้าได้เลยค่ะ`
    : `สินค้าที่ค้นหาไม่มีพร้อมส่งในขณะนี้ค่ะ\n\n${salesContextCopy(context)}\n\nให้ช่วยแนะนำรสหรือรุ่นอื่นที่พร้อมส่งแทนไหมคะ`;

  await sendReply(replyToken, {
    type: 'text',
    text,
    quickReply: {
      items: buildSalesQuickReply(context, 'stock'),
    },
  });
}

function marboFamilyFlavorSummary(products: Awaited<ReturnType<typeof getAvailableProducts>>, brand: string) {
  const flavors = products
    .filter((product) => product.brandName?.toUpperCase() === brand)
    .map((product) => product.flavorNameTh || product.flavorName)
    .filter(Boolean)
    .slice(0, 4);

  return flavors.length > 0 ? flavors.join(' · ') : 'ตอนนี้ไม่มีสินค้าพร้อมส่ง';
}

async function replyWithMarboFamilyChoice(
  replyToken: string,
  products: Awaited<ReturnType<typeof getAvailableProducts>>,
  context: SalesContext,
) {
  const switchFlavors = marboFamilyFlavorSummary(products, 'MARBO');
  const disposableFlavors = marboFamilyFlavorSummary(products, 'M BAR');

  await sendReply(replyToken, {
    type: 'text',
    text: `MARBO มี 2 แบบค่ะ เพื่อให้เลือกได้ตรงใจ\n\n🧩 หัวเปลี่ยน\nMARBO M SWITCH 15K\nรสพร้อมส่ง: ${switchFlavors}\n\n💨 ดูดแล้วทิ้ง\nM BAR 10K\nรสพร้อมส่ง: ${disposableFlavors}\n\n${salesContextCopy(context)}\n\nลูกค้าต้องการแบบหัวเปลี่ยน หรือแบบดูดแล้วทิ้งคะ`,
    quickReply: {
      items: [
        {
          type: 'action',
          action: { type: 'message', label: 'หัวเปลี่ยน MARBO', text: 'MARBO M SWITCH มีรสอะไรเหลือ' },
        },
        {
          type: 'action',
          action: { type: 'message', label: 'ดูดแล้วทิ้ง M BAR', text: 'M BAR มีรสอะไรเหลือ' },
        },
        ...buildSalesQuickReply(context, 'stock'),
      ],
    },
  });
}

// Reply with product list
async function replyWithProductList(replyToken: string, context: SalesContext) {
  const products = await getAvailableProducts(10);

  const message = {
    type: 'text',
    text: '📦 ตัวอย่างสินค้าพร้อมส่งตอนนี้:\n\n' +
      products.map(p => `• ${p.brandNameTh} ${p.flavorNameTh} - ฿${p.price}`).join('\n') +
      `\n\n${salesContextCopy(context)}\n\nลูกค้าสนใจแบรนด์หรือรสไหนคะ กดดูรายการทั้งหมดแล้วเพิ่มลงตะกร้าได้เลยค่ะ`,
    quickReply: { items: buildSalesQuickReply(context, 'stock') },
  };

  await sendReply(replyToken, message);
}

// Reply with price list
async function replyWithPriceList(replyToken: string, context: SalesContext) {
  const products = await getAvailableProducts(100);
  const prices = new Map<string, number>();
  for (const product of products) prices.set(product.brandNameTh, product.price);
  const message = {
    type: 'text',
    text: '💰 ราคาสินค้า:\n\n' +
      [...prices.entries()].map(([brand, price]) => `• ${brand} - ฿${price}`).join('\n') +
      `\n\n${salesContextCopy(context)}\n\nลูกค้าสนใจแบรนด์ไหนคะ เดี๋ยวระบบพาไปเลือกรสที่พร้อมส่งค่ะ`,
    quickReply: { items: buildSalesQuickReply(context, 'stock') },
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

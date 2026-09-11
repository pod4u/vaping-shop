import {
  buildMemberLiffUrl,
  MEMBER_LIFF_URL,
  type LineAccountAlias,
} from './line-account-links.ts';

export function includesAny(value: string, keywords: readonly string[]) {
  return keywords.some((keyword) => value.includes(keyword));
}

export { MEMBER_LIFF_URL };

export function isShippingQuestion(value: string) {
  return includesAny(value, ['ค่าส่ง', 'ค่าจัดส่ง', 'ส่งฟรี', 'ส่งกี่บาท']);
}

export function isDispatchScheduleQuestion(value: string) {
  return includesAny(value, ['รอบจัดส่ง', 'ส่งวันไหน', 'ส่งของวันไหน', 'ตัดรอบ', 'ส่งวันนี้', 'ส่งพรุ่งนี้']);
}

export function isStoreHoursQuestion(value: string) {
  return includesAny(value, ['เปิดทุกวัน', 'เปิดวันไหน', 'วันหยุด', 'ร้านเปิด', 'เปิดกี่โมง']);
}

export function isPaymentQuestion(value: string) {
  return includesAny(value, ['โอนเงิน', 'ชำระเงิน', 'เลขบัญชี', 'บัญชีไหน', 'ส่งสลิป', 'จ่ายเงิน']);
}

export function isTrackingQuestion(value: string) {
  return includesAny(value, ['เลขพัสดุ', 'tracking', 'แทรค', 'เช็กพัสดุ', 'เช็คพัสดุ']);
}

export function isCancellationQuestion(value: string) {
  return includesAny(value, ['ยกเลิกออเดอร์', 'ยกเลิก order', 'ยกเลิกคำสั่งซื้อ']);
}

export function isProductAvailabilityQuestion(value: string) {
  return includesAny(value, [
    'มีรสอะไร',
    'รสอะไรเหลือ',
    'มีอะไรเหลือ',
    'ตัวไหนเหลือ',
    'เหลือไหม',
    'เหลือมั้ย',
    'มีไหม',
    'มีมั้ย',
    'ของมีไหม',
    'ของมีมั้ย',
  ]);
}

// ลูกค้าหลายคนเรียกทั้ง MARBO M SWITCH และ M BAR ว่า “มาโบ”
// ใช้เฉพาะคำถามกว้าง ๆ เพื่อให้เลือกประเภทก่อน โดยไม่แย่งคำถามเจาะจงเรื่องรส
// เช่น “มาโบ องุ่นมีไหม” จะยังค้นหาตามรสตามปกติ
export function isGenericMarboFamilyQuestion(value: string) {
  const compact = value.toLowerCase().replace(/[\s?!.]/g, '');
  return /^(?:มาร์โบ|มาโบ|marbo)(?:มีรสอะไร(?:บ้าง)?|มีอะไร(?:บ้าง)?|มีอะไรเหลือ(?:บ้าง)?|เหลืออะไร(?:บ้าง)?|เหลือไหม|เหลือมั้ย|มีไหม|มีมั้ย)?$/.test(compact);
}

export function isOrderHelpQuestion(value: string) {
  return includesAny(value, [
    'สั่งยังไง',
    'สั่งอย่างไร',
    'วิธีสั่ง',
    'ซื้อยังไง',
    'ซื้ออย่างไร',
    'ออเดอร์ยังไง',
  ]);
}

export function isGreeting(value: string) {
  return /^(สวัสดี(?:ครับ|ค่ะ|คับ|จ้า)?|หวัดดี(?:ครับ|ค่ะ)?|hello|hi|ดีครับ|ดีค่ะ)[!?. ]*$/.test(value);
}

export function shouldHandOffImageWithoutReply(paymentErrorCode: string) {
  return paymentErrorCode === 'LINE_IDENTITY_NOT_FOUND'
    || paymentErrorCode === 'NO_ACTIVE_PAYMENT';
}

export function isExplicitProductOrder(value: string) {
  if (includesAny(value, ['ไหม', 'มั้ย', 'หรือเปล่า', 'เท่าไหร่', 'กี่บาท', 'ใช่ไหม'])) return false;
  return includesAny(value, ['ต้องการสั่ง', 'ขอสั่ง', 'สั่ง ', 'สั่งซื้อ', 'ซื้อ ', 'รับ ']);
}

export function buildGreetingMessage(
  context: { linked: boolean; hasDefaultAddress: boolean } | null,
  accountAlias: LineAccountAlias = 'primary',
) {
  const memberUrl = buildMemberLiffUrl(accountAlias);
  const stockAction = {
    type: 'action',
    action: { type: 'uri', label: 'ดูสินค้าพร้อมส่ง', uri: 'https://www.pod4u.store/stock?source=line-greeting' },
  };

  if (context?.linked && context.hasDefaultAddress) {
    return {
      type: 'text',
      text: '👋 สวัสดีค่ะ ยินดีต้อนรับกลับมาที่ Pod4U\n\nบัญชีสมาชิกและที่อยู่จัดส่งพร้อมใช้งานแล้วค่ะ วันนี้กำลังมองหาแบรนด์หรือรสไหนอยู่คะ',
      quickReply: {
        items: [
          stockAction,
          {
            type: 'action',
            action: { type: 'uri', label: 'เช็กออเดอร์', uri: buildMemberLiffUrl(accountAlias, 'orders') },
          },
        ],
      },
    };
  }

  if (context?.linked) {
    return {
      type: 'text',
      text: '👋 สวัสดีค่ะ ยินดีต้อนรับกลับมาที่ Pod4U\n\nบัญชีสมาชิกเชื่อมเรียบร้อยแล้ว เหลือเพิ่มที่อยู่จัดส่งหลักก่อนยืนยันออเดอร์ค่ะ ต้องการดูสินค้าก่อนหรือเปิดหน้าสมาชิกคะ',
      quickReply: {
        items: [
          stockAction,
          {
            type: 'action',
            action: { type: 'uri', label: 'เปิดหน้าสมาชิก', uri: memberUrl },
          },
        ],
      },
    };
  }

  return {
    type: 'text',
    text: '👋 สวัสดีค่ะ ยินดีต้อนรับสู่ Pod4U\n\nดูสินค้าพร้อมส่งได้ทันที หรือเข้าสู่ระบบสมาชิกครั้งเดียวเพื่อให้ระบบช่วยจำข้อมูล ออเดอร์ และเลขพัสดุค่ะ วันนี้กำลังมองหาแบรนด์หรือรสไหนอยู่คะ',
    quickReply: {
      items: [
        stockAction,
        {
          type: 'action',
          action: { type: 'uri', label: 'เข้าสู่ระบบสมาชิก', uri: memberUrl },
        },
      ],
    },
  };
}

function automationStep(number: string, title: string, detail: string) {
  return {
    type: 'box',
    layout: 'horizontal',
    spacing: 'md',
    contents: [
      {
        type: 'box',
        layout: 'vertical',
        width: '30px',
        height: '30px',
        cornerRadius: '15px',
        backgroundColor: '#C8FF00',
        justifyContent: 'center',
        alignItems: 'center',
        contents: [{ type: 'text', text: number, color: '#10182E', weight: 'bold', align: 'center' }],
      },
      {
        type: 'box',
        layout: 'vertical',
        flex: 1,
        contents: [
          { type: 'text', text: title, weight: 'bold', color: '#101828', wrap: true },
          { type: 'text', text: detail, size: 'xs', color: '#667085', wrap: true, margin: 'xs' },
        ],
      },
    ],
  };
}

export function buildAutomationMenuMessage(accountAlias: LineAccountAlias = 'primary') {
  return {
    type: 'flex',
    altText: 'สั่งซื้อกับ Pod4U ง่าย ๆ ใน 3 ขั้นตอน',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#10182E',
        paddingAll: '20px',
        contents: [
          { type: 'text', text: 'Pod4U', color: '#C8FF00', weight: 'bold', size: 'sm' },
          { type: 'text', text: 'สั่งซื้อง่ายใน 3 ขั้นตอน', color: '#FFFFFF', weight: 'bold', size: 'xl', margin: 'sm', wrap: true },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'lg',
        contents: [
          automationStep('1', 'ดูสินค้าพร้อมส่ง', 'เช็กสินค้า ราคา และจำนวนคงเหลือล่าสุด'),
          automationStep('2', 'เข้าสู่ระบบสมาชิก', 'เชื่อมครั้งแรกครั้งเดียว บันทึกที่อยู่และออเดอร์'),
          automationStep('3', 'เพิ่มตะกร้าแล้วส่งเข้า LINE', 'ตรวจรายการ ยืนยัน และส่งสลิปในแชทนี้'),
          { type: 'separator', margin: 'md' },
          { type: 'text', text: 'สมาชิกเช็กออเดอร์ เลขพัสดุ และรับเครดิตรีวิว ฿5 ได้ค่ะ', size: 'xs', color: '#667085', wrap: true, margin: 'md' },
          { type: 'text', text: 'วันนี้กำลังมองหาแบรนด์หรือรสไหนอยู่คะ?', size: 'sm', color: '#101828', weight: 'bold', wrap: true, margin: 'md' },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#A7D900',
            action: { type: 'uri', label: 'ดูสินค้าพร้อมส่ง', uri: 'https://www.pod4u.store/stock?source=line' },
          },
          {
            type: 'button',
            style: 'secondary',
            action: { type: 'uri', label: 'เข้าสู่ระบบสมาชิก', uri: buildMemberLiffUrl(accountAlias) },
          },
        ],
      },
    },
  };
}

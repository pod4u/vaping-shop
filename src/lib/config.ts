// Store Configuration - Edit this file to customize your shop
export const storeConfig = {
  // Store Information
  storeName: "Pod4U",
  tagline: "ร้านขายพอดเปลี่ยนหัว และพอดใช้แล้วทิ้ง ราคาส่ง ครบ จบในที่เดียว",
  
  // Contact
  lineId: "@994tiktt", // LINE Official Account
  lineLink: "https://lin.ee/RU5qNLj", // LINE QR Code Link
  phone: "08X-XXX-XXXX", // TODO: Replace with your phone
  
  // Service
  freeShippingMin: 800,
  serviceHours: "24 ชั่วโมง",
  
  // Social Links (optional)
  facebook: "",
  instagram: "",
} as const;

// Product Categories
export const categories = [
  {
    id: "disposable-pod",
    name: "DISPOSABLE POD",
    nameTh: "พอดใช้แล้วทิ้ง",
    description: "พอดใช้แล้วทิ้ง สะดวก พกพาง่าย",
    icon: "💨",
  },
  {
    id: "flavor-pod",
    name: "FLAVOR POD",
    nameTh: "หัวน้ำยา หัวพอด",
    description: "หัวพอดรสชาติหลากหลาย",
    icon: "🍒",
  },
] as const;

// Store Benefits
export const benefits = [
  {
    icon: "📦",
    title: "สินค้าหลากหลาย",
    description: "มีสินค้าให้เลือกมากมาย ราคาเริ่มต้นเพียงหลักร้อย",
  },
  {
    icon: "🆕",
    title: "อัปเดตสินค้าใหม่",
    description: "สินค้าใหม่ๆ เข้ามาตลอด ไม่ตกเทรนด์",
  },
  {
    icon: "🎁",
    title: "โปรโมชั่นสมาชิก",
    description: "สมาชิกได้รับสิทธิพิเศษและโปรโมชั่นพิเศษ",
  },
  {
    icon: "🕐",
    title: "บริการ 24 ชั่วโมง",
    description: "พร้อมให้บริการก่อนและหลังการขายตลอด 24 ชม.",
  },
  {
    icon: "🚚",
    title: "สต็อกพร้อมส่ง",
    description: "สินค้าพร้อมสต็อก ส่งไวไม่ต้องรอนาน",
  },
  {
    icon: "✅",
    title: "รับประกันคุณภาพ",
    description: "สินค้าคุณภาพดี ราคาไม่แพง การันตีความพอใจ",
  },
] as const;
// Store Configuration - Edit this file to customize your shop
export const storeConfig = {
  // Store Information
  storeName: "VAPING SHOP",
  tagline: "ร้านขายพอตเปลี่ยนหัว และพอตใช้แล้วทิ้ง ราคาส่ง ครบ จบในที่เดียว",
  
  // Contact
  lineId: "@vaping_shop", // LINE Official Account
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
    id: "pod-system",
    name: "POD SYSTEM",
    nameTh: "พอตไฟฟ้า",
    description: "อุปกรณ์พอตไฟฟ้า สามารถเปลี่ยนหัวได้",
    icon: "🔋",
  },
  {
    id: "disposable-pod",
    name: "DISPOSABLE POD",
    nameTh: "พอตใช้แล้วทิ้ง",
    description: "พอตใช้แล้วทิ้ง สะดวก พกพาง่าย",
    icon: "💨",
  },
  {
    id: "coil-cartridge",
    name: "COIL CARTRIDGE",
    nameTh: "คอยล์บุหรี่ไฟฟ้า",
    description: "คอยล์สำหรับพอตไฟฟ้าทุกยี่ห้อ",
    icon: "⚡",
  },
  {
    id: "flavor-pod",
    name: "FLAVOR POD",
    nameTh: "หัวน้ำยา หัวพอต",
    description: "หัวพอตรสชาติหลากหลาย",
    icon: "🍒",
  },
  {
    id: "salt nic",
    name: "SALTNIC E-LIQUIDS",
    nameTh: "น้ำยาซอลนิค",
    description: "น้ำยาซอลนิค จากมาเลเซียและ USA",
    icon: "🧪",
  },
  {
    id: "freebase",
    name: "FREEBASE E-LIQUIDS",
    nameTh: "น้ำยาฟรีเบส",
    description: "น้ำยาฟรีเบส 30ml, 60ml, 100ml",
    icon: "💧",
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
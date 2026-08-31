# 💨 VAPING SHOP

เว็บไซต์ร้านขายพอตบุหรี่ไฟฟ้า สร้างด้วย Next.js 14 + Tailwind CSS + TypeScript

---

## 🎨 Design System

### ฟ้อน
- **Prompt** - ฟ้อนไทยที่ออกแบบมาสำหรับหน้าจอ รองรับ Thai + Latin

### สี (Color Palette)
| ชื่อ | โค้ด | ใช้กับ |
|-----|------|--------|
| Neon Orange | `#ff6b00` | Primary, CTA buttons |
| Neon Purple | `#9333ea` | Accents, gradients |
| Neon Blue | `#3b82f6` | Accents, gradients |
| Neon Pink | `#ec4899` | Badges, highlights |
| Dark 100 | `#1a1a2e` | Cards background |
| Dark 200 | `#16213e` | Section background |
| Dark 300 | `#0f0f23` | Navbar/Footer |
| Dark 400 | `#0a0a1a` | Main background |

### Effects
- **Glassmorphism** - Blur + transparency สำหรับ cards และ navbar
- **Neon Glow** - Box-shadow gradient effect
- **Gradient Text** - ตัวหนังสือไล่สี
- **Hover Animations** - Scale, translate, glow effects

---

## 📂 Project Structure

```
vaping-shop/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout (Header + Footer)
│   │   ├── page.tsx            # หน้าแรก (Landing Page)
│   │   ├── globals.css         # Global styles + animations
│   │   └── products/
│   │       ├── page.tsx        # หน้ารายการสินค้า
│   │       └── [id]/page.tsx   # หน้ารายละเอียดสินค้า
│   │
│   ├── components/             # React Components
│   │   ├── Header.tsx          # Navbar + Dropdown menu
│   │   ├── Footer.tsx          # Footer พร้อม links
│   │   ├── Hero.tsx            # Hero section หน้าแรก
│   │   ├── Categories.tsx      # หมวดหมู่สินค้า 6 หมวด
│   │   ├── FeaturedProducts.tsx# สินค้าแนะนำ
│   │   ├── ProductCard.tsx     # Product card component
│   │   ├── Benefits.tsx        # ทำไมต้องเลือกร้านเรา
│   │   ├── BlogSection.tsx     # บทความ
│   │   └── LineButton.tsx      # Floating LINE button
│   │
│   ├── lib/
│   │   └── config.ts           # ⚙️ Config ร้านค้า (แก้ไขที่นี่!)
│   │
│   ├── data/
│   │   ├── products.ts         # Mock product data
│   │   └── blog.ts             # Mock blog data
│   │
│   └── types/
│       ├── product.ts          # Product TypeScript type
│       └── blog.ts             # Blog TypeScript type
│
├── tailwind.config.js          # Tailwind configuration
├── next.config.js              # Next.js configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies
```

---

## ⚙️ Configuration

### ตั้งค่าร้านค้า

แก้ไขไฟล์ `src/lib/config.ts`:

```typescript
export const storeConfig = {
  // ข้อมูลร้าน
  storeName: "VAPING SHOP",                    // ชื่อร้าน
  tagline: "ร้านขายพอต...",                    // สแลน
  
  // ติดต่อ
  lineId: "@your-line-id",                     // LINE ID
  lineLink: "https://lin.ee/your-link",        // LINE Link
  phone: "08X-XXX-XXXX",                       // เบอร์โทร
  
  // บริการ
  freeShippingMin: 800,                        // ส่งฟรีเมื่อซื้อครบ (บาท)
  serviceHours: "24 ชั่วโมง",                  // เวลาบริการ
};
```

### เพิ่ม/แก้ไขหมวดหมู่สินค้า

ในไฟล์ `src/lib/config.ts`:

```typescript
export const categories = [
  {
    id: "pod-system",           // URL slug
    name: "POD SYSTEM",         // ชื่อ EN
    nameTh: "พอตไฟฟ้า",         // ชื่อ TH
    description: "...",         // รายละเอียด
    icon: "🔋",                 // Emoji icon
  },
  // เพิ่มหมวดหมู่ใหม่ที่นี่...
];
```

### เพิ่ม/แก้ไขสินค้า

ในไฟล์ `src/data/products.ts`:

```typescript
export const products: Product[] = [
  {
    id: 1,
    name: "RELX DIVA 30000 Puffs",
    category: "disposable-pod",     // ต้องตรงกับ category id
    price: 550,
    originalPrice: 650,             // ราคาเดิม (optional)
    image: "/products/relx-diva.jpg",
    description: "พอตใช้แล้วทิ้ง...",
    features: ["30,000 Puffs", "Type-C Charging"],
    inStock: true,
    isFeatured: true,               // แสดงในสินค้าแนะนำ
  },
  // เพิ่มสินค้าใหม่ที่นี่...
];
```

---

## 📱 Features

### หน้าแรก (Landing Page)

| Section | รายละเอียด |
|---------|-----------|
| **Hero** | Animated gradient orbs, Grid pattern, Stats, CTA buttons |
| **Categories** | 6 หมวดหมู่สินค้า พร้อม icon และ hover effect |
| **Featured Products** | สินค้าแนะนำ 4 ชิ้น พร้อมราคาและส่วนลด |
| **Benefits** | 6 ข้อดีของร้าน พร้อม icon |
| **Blog** | บทความ 3 ชิ้น |

### Navigation

- **Navbar** - Fixed header พร้อม glassmorphism
- **Dropdown Menu** - เลือกหมวดหมู่สินค้าได้
- **Mobile Menu** - Hamburger menu สำหรับมือถือ
- **LINE Button** - ปุ่มติดต่อ LINE ที่ navbar

### หน้าสินค้า (Products Page)

- **Search** - ค้นหาสินค้าตามชื่อ/รายละเอียด
- **Category Filter** - กรองตามหมวดหมู่
- **Category Pills** - กดเลือกหมวดหมู่ได้ง่าย
- **Product Grid** - แสดงสินค้าแบบ grid 4 คอลัมน์

### หน้ารายละเอียดสินค้า (Product Detail)

- **Breadcrumb** - แสดงตำแหน่งปัจจุบัน
- **Product Image** - รูปภาพขนาดใหญ่ พร้อม glow effect
- **Price & Discount** - แสดงราคา ส่วนลด และเปอร์เซ็นต์
- **Features** - คุณสมบัติสินค้า
- **Stock Status** - สถานะสินค้า (มีสต็อก/หมด)
- **LINE CTA** - ปุ่มสั่งซื้อผ่าน LINE
- **Related Products** - สินค้าที่เกี่ยวข้อง

### Components ทั่วไป

| Component | ใช้ที่ไหน | Features |
|-----------|----------|----------|
| `Header` | ทุกหน้า | Dropdown, Mobile menu, LINE button |
| `Footer` | ทุกหน้า | Category links, Contact info |
| `ProductCard` | Products, Detail, Home | Hover glow, Discount badge, Stock status |
| `LineButton` | ทุกหน้า | Floating, Pulse animation, Gradient |

---

## 🚀 Getting Started

### ติดตั้ง Dependencies

```bash
cd vaping-shop
npm install
```

### รัน Development Server

```bash
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

### Build Production

```bash
npm run build
npm start
```

---

## 📦 Dependencies

| Package | Version | ใช้ทำอะไร |
|---------|---------|----------|
| `next` | 14.x | React framework |
| `react` | 18.x | UI library |
| `typescript` | 5.x | Type safety |
| `tailwindcss` | 3.x | CSS framework |

---

## 🔧 Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

---

## 📝 To Do / อาจเพิ่มในอนาคต

- [ ] หน้า Blog แสดงบทความทั้งหมด
- [ ] หน้ารายละเอียดบทความ
- [ ] ระบบตะกร้าสินค้า
- [ ] ระบบ Checkout
- [ ] Admin panel จัดการสินค้า
- [ ] Backend API
- [ ] Database integration
- [ ] Authentication

---

## 📄 License

MIT License - สามารถนำไปใช้ได้อย่างอิสระ

---

## 👨‍💻 Created By

สร้างด้วย ❤️ โดย Qwen Code AI

---

**หมายเหตุ:** ข้อมูลสินค้าและบทความเป็น Mock data สามารถแก้ไขได้ใน `src/data/` และ `src/lib/config.ts`
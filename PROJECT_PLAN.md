# 🚀 Vaping Shop E-Commerce System Plan

> อัพเดทล่าสุด: 30 Aug 2026

---

## 📋 ภาพรวมระบบ

### **ปัญหาปัจจุบัน:**
- ❌ ลูกค้าสั่งผ่าน LINE → แอดมินคีย์เอง → Human Error
- ❌ ชื่อสินค้าสับสน (Marbolo, มาร์โบโล, มาโบโล, Marble...)
- ❌ สต็อกตัดผิดเพราะคีย์ผิด
- ❌ ถ้า LINE ถูกปิด → ลูกค้าไม่สามารถสั่งซื้อได้

### **โซลูชัน:**
- ✅ ลูกค้าสมัคร/กดซื้อในเว็บ → ระบบตัดสต็อกอัตโนมัติ
- ✅ ลด Human Error 100%
- ✅ LINE ใช้แค่คอนเฟิร์ม + ส่ง EMS
- ✅ ถ้า LINE ปิด → เว็บยังใช้ได้

---

## 🎯 ฟีเจอร์ทั้งหมด

### **Phase 1: เว็บไซต์หน้าร้าน** ✅ เสร็จแล้ว

| ฟีเจอร์ | สถานะ | ไฟล์ |
|---------|-------|------|
| หน้าแรก + Hero | ✅ | `src/app/(public)/page.tsx` |
| หน้าสินค้า | ✅ | `src/app/(public)/products/` |
| หน้าแบรนด์ | ✅ | `src/app/(public)/brand/[id]/` |
| Header + Footer | ✅ | `src/components/` |
| ปุ่ม LINE | ✅ | `src/components/LineButton.tsx` |
| **แบนเนอร์ประกาศ** | ⏳ TODO | - |

### **Phase 2: Admin Panel** ✅ เสร็จแล้ว

| ฟีเจอร์ | สถานะ | ไฟล์ |
|---------|-------|------|
| Dashboard + กราฟ | ✅ | `src/app/admin/page.tsx` |
| จัดการสต็อก | ✅ | `src/app/admin/stock/page.tsx` |
| ยืนยันก่อนบันทึก | ✅ | Modal confirmation |
| หน้าออเดอร์ | ✅ | `src/app/admin/orders/` |
| หน้าลูกค้า | ✅ | `src/app/admin/customers/` |
| หน้าตั้งค่า | ✅ | `src/app/admin/settings/` |

### **Phase 3: ระบบลูกค้า** ⏳ รอ Supabase

| ฟีเจอร์ | สถานะ | คำอธิบาย |
|---------|-------|----------|
| สมัครสมาชิก | ⏳ | กรอกเบอร์/ชื่อ + LINE ID |
| ล็อกอิน | ⏳ | OTP หรือ LINE Login |
| **ส่วนลด 10 บาท** | ⏳ | สำหรับสมาชิกทุกออเดอร์ |
| ประวัติการสั่งซื้อ | ⏳ | ลูกค้าดูได้ในเว็บ |

### **Phase 4: ระบบสั่งซื้อ** ⏳ รอ Supabase + LINE

| ฟีเจอร์ | สถานะ | คำอธิบาย |
|---------|-------|----------|
| หน้าตะกร้า | ⏳ | เลือกสินค้า + จำนวน |
| Checkout | ⏳ | กรอกที่อยู่ + ชำระเงิน |
| **ตัดสต็อกอัตโนมัติ** | ⏳ | ไม่ต้องคีย์เอง |
| **ส่ง LINE คอนเฟิร์ม** | ⏳ | แจ้งออเดอร์เข้าไป |
| เลข EMS | ⏳ | อัพเดท + แจ้ง LINE |

### **Phase 5: LINE Integration** ⏳ รอ LINE OA

| ฟีเจอร์ | สถานะ | คำอธิบาย |
|---------|-------|----------|
| Webhook รับ userId | ⏳ | เก็บลูกค้าใหม่อัตโนมัติ |
| Broadcast แจ้งเตือน | ⏳ | สินค้าใหม่/โปรโมชั่น |
| คอนเฟิร์มออเดอร์ | ⏳ | ส่งจากเว็บ → LINE |
| ส่งเลข EMS | ⏳ | แจ้งทาง LINE |

---

## 🔄 Flow การทำงาน

### **Flow ปัจจุบัน (Manual):**
```
ลูกค้า LINE → แอดมินอ่าน → คีย์เอง → ตัดสต็อกเอง
                    ↓
              Human Error! (คีย์ผิด)
```

### **Flow ใหม่ (Automated):**
```
ลูกค้าเว็บ → เลือกสินค้า → กดสั่ง → ระบบตัดสต็อกอัตโนมัติ
                                        ↓
                              ส่ง LINE คอนเฟิร์ม
                                        ↓
                              แอดมินเห็นในหลังบ้าน
                                        ↓
                              จัดส่ง → ใส่ EMS → ส่ง LINE
```

### **ถ้า LINE ถูกปิด:**
```
ลูกค้าเว็บ → กดสั่ง → ระบบทำงานปกติ
                                        ↓
                              แอดมินเห็นในหลังบ้าน
                                        ↓
                              จัดส่ง → ใส่ EMS → SMS/เว็บ
```

---

## 📦 Database Schema (Supabase)

```sql
-- ตารางลูกค้า
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100),
  line_user_id VARCHAR(50),
  email VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ตารางออเดอร์
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  total_price DECIMAL,
  discount DECIMAL DEFAULT 10, -- ส่วนลด 10 บาท
  status VARCHAR(20) DEFAULT 'pending',
  tracking_number VARCHAR(50), -- EMS
  created_at TIMESTAMP DEFAULT NOW()
);

-- ตารางรายการสั่งซื้อ
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  product_id VARCHAR(50),
  flavor_id VARCHAR(50),
  quantity INTEGER,
  price DECIMAL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ตารางที่อยู่
CREATE TABLE addresses (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  name VARCHAR(100),
  phone VARCHAR(20),
  address TEXT,
  province VARCHAR(50),
  postal_code VARCHAR(10),
  is_default BOOLEAN DEFAULT false
);
```

---

## 🛠️ APIs ที่ต้องทำ

### **Customer APIs**
- `POST /api/customers/register` - สมัครสมาชิก
- `POST /api/customers/login` - ล็อกอิน (OTP)
- `GET /api/customers/me` - ดูข้อมูลตัวเอง
- `GET /api/customers/orders` - ประวัติการสั่งซื้อ

### **Order APIs**
- `POST /api/orders` - สร้างออเดอร์ (ตัดสต็อก)
- `GET /api/orders/:id` - ดูรายละเอียด
- `PUT /api/orders/:id/status` - อัพเดทสถานะ
- `PUT /api/orders/:id/tracking` - ใส่เลข EMS

### **LINE APIs**
- `POST /api/line/webhook` - รับข้อความจาก LINE
- `POST /api/line/broadcast` - ส่งแจ้งเตือนทุกคน
- `POST /api/line/notify` - ส่งคอนเฟิร์มออเดอร์

---

## 🎨 Human Error Solutions

### **ปัญหา:**
Marbolo, มาร์โบโล, มาโบโล, Marble, Mobolow... สับสน!

### **แก้ไข:**
1. ✅ **Dropdown เลือกสินค้า** - ไม่ต้องพิมพ์
2. ✅ **Product ID คงที่** - `marbo-blueberry-01`
3. ✅ **ตัดสต็อกอัตโนมัติ** - จาก Product ID
4. ✅ **Validation** - ไม่ให้สั่งเกินสต็อก

---

## ✅ สิ่งที่เสร็จแล้ว

| ระบบ | สถานะ | รายละเอียด |
|------|-------|------------|
| **หน้าร้าน** | ✅ 100% | Home, Products, Brands |
| **Admin Panel** | ✅ 100% | Dashboard, Stock, Orders, Customers |
| **กราฟ Dashboard** | ✅ 100% | Line, Pie, Bar charts |
| **Confirmation Modal** | ✅ 100% | ยืนยันก่อนบันทึกสต็อก |
| **Stock API** | ✅ 100% | JSON file storage |
| **Layout แยก** | ✅ 100% | Public vs Admin |

## ⏳ รอทำ

| ระบบ | ต้องการ | คำอธิบาย |
|------|---------|----------|
| **สมัครสมาชิก** | Supabase | เก็บข้อมูลลูกค้า |
| **ระบบสั่งซื้อ** | Supabase | ตะกร้า, Checkout |
| **ตัดสต็อกอัตโนมัติ** | Supabase | ลด Human Error |
| **LINE Webhook** | LINE OA | รับ userId |
| **LINE Broadcast** | LINE OA | ส่งแจ้งเตือน |
| **แบนเนอร์ประกาศ** | - | แจ้งเปลี่ยน LINE ID |

## ✅ เพิ่มใหม่ (Fuzzy Search)

| ระบบ | สถานะ | ไฟล์ |
|------|-------|------|
| Fuzzy Search Algorithm | ✅ | `src/lib/fuzzy-search.ts` |
| LINE Webhook Handler | ✅ | `src/app/api/line/webhook/route.ts` |
| Quick Reply Integration | ✅ | ใน webhook handler |
| Misspelling Detection | ✅ | มาโบโล → Marbo ✅ |

---

## 📝 Next Steps

### **ทำได้เลยตอนนี้:**
1. ✅ แบนเนอร์ประกาศ LINE ID ใหม่
2. ✅ เตรียมโค้ด LINE Webhook
3. ✅ เตรียมโค้ด Order System

### **ต้องรอ:**
1. Supabase account → ระบบลูกค้า/ออเดอร์
2. LINE OA → Webhook + Broadcast

---

## 🔗 URLs

| หน้า | URL |
|------|-----|
| หน้าร้าน | http://localhost:3000 |
| Admin Panel | http://localhost:3000/admin |
| Stock Management | http://localhost:3000/admin/stock |
| Orders | http://localhost:3000/admin/orders |

---

## 📱 LINE Message Templates

### **คอนเฟิร์มออเดอร์:**
```
✅ ยืนยันออเดอร์สำเร็จ!

ออเดอร์ #1234
─────────
📦 Marbo Blueberry x 2
   ฿250 x 2 = ฿500

📦 Mood Mango x 1
   ฿290 x 1 = ฿290
─────────
ยอดรวม: ฿790
ส่วนลดสมาชิก: -฿10
─────────
สุทธิ: ฿780

📍 จัดส่งไปที่:
คุณสมชาย
08x-xxx-1234
123/45 ถ.สุขุมวิท แขวงคลองเตย
กรุงเทพฯ 10110
```

### **แจ้งเลข EMS:**
```
📦 สินค้าถูกจัดส่งแล้ว!

เลข EMS: EM123456789TH

ตรวจสอบได้ที่:
https://track.thailandpost.co.th/EM123456789TH

ขอบคุณที่ใช้บริการครับ 🙏
```
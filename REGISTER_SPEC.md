# 📝 Specification: หน้าสมัครสมาชิก + Supabase

## 🎯 วัตถุประสงค์
เก็บฐานข้อมูลลูกค้าไว้ใน Supabase เผื่อ LINE โดนปิด ยังมีข้อมูลติดต่อได้

---

## 📊 1. Supabase Table Structure

### **Table: `customers`**

```sql
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- ข้อมูลส่วนตัว
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  line_id VARCHAR(50),
  email VARCHAR(100),
  
  -- ที่อยู่
  address TEXT,
  district VARCHAR(50),      -- แขวง/ตำบล
  sub_district VARCHAR(50),  -- เขต/อำเภอ
  province VARCHAR(50),
  postal_code VARCHAR(10),
  
  -- Metadata
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(10, 2) DEFAULT 0,
  last_order_date TIMESTAMP,
  
  -- Status
  is_active BOOLEAN DEFAULT true
);

-- Index สำหรับค้นหาเบอร์โทร
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_line_id ON customers(line_id);
```

---

## 🎨 2. Frontend - หน้าสมัครสมาชิก

### **Path:** `/register` (App Router)

### **Form Fields:**
```
┌─────────────────────────────────────┐
│   📝 สมัครสมาชิก                   │
│                                     │
│ ชื่อ-นามสกุล *      [___________]  │
│ เบอร์โทรศัพท์ *    [___________]  │
│ LINE ID (ไม่บังคับ) [___________]  │
│ Email (ไม่บังคับ)   [___________]  │
│                                     │
│ ─── ที่อยู่จัดส่ง ───              │
│ บ้านเลขที่/หมู่ *   [___________]  │
│ แขวง/ตำบล          [___________]  │
│ เขต/อำเภอ *        [___________]  │
│ จังหวัด *          [___________]  │
│ รหัสไปรษณีย์        [___________]  │
│                                     │
│ [ ✅ สมัครสมาชิก ]                 │
└─────────────────────────────────────┘
```

### **Validation:**
- ✅ ชื่อ-นามสกุล: จำเป็น, อย่างน้อย 2 ตัวอักษร
- ✅ เบอร์โทร: จำเป็น, รูปแบบ 0[0-9]{9}
- ✅ LINE ID: ไม่บังคับ
- ✅ Email: ไม่บังคับ, validate format
- ✅ ที่อยู่: จำเป็นอย่างน้อย บ้านเลขที่, เขต, จังหวัด

### **Component:** `/src/app/(public)/register/page.tsx`
- Navy theme styling (match กับหน้าอื่น)
- Responsive design
- Success/Error message
- Auto redirect ไปหน้าแรกหลังสมัครสำเร็จ

---

## 🔌 3. API Endpoints

### **POST `/api/customers/register`**
```typescript
// Request body
{
  full_name: string,
  phone: string,
  line_id?: string,
  email?: string,
  address: string,
  district?: string,
  sub_district: string,
  province: string,
  postal_code?: string
}

// Response
{
  success: true,
  customer_id: number,
  message: "สมัครสมาชิกสำเร็จ!"
}

// Error
{
  success: false,
  error: "เบอร์โทรนี้เคยสมัครแล้ว"
}
```

### **GET `/api/admin/customers`** (Admin only)
```typescript
// Response
{
  customers: [
    {
      id: 1,
      full_name: "John Doe",
      phone: "0812345678",
      line_id: "@johndoe",
      address: "...",
      total_orders: 5,
      total_spent: 2500,
      created_at: "2026-09-02"
    }
  ]
}
```

---

## 🛡️ 4. Admin Panel - หน้าลูกค้า

### **Path:** `/admin/customers`

### **Features:**
- ✅ แสดงรายชื่อลูกค้าทั้งหมด
- ✅ ค้นหาลูกค้า (ชื่อ, เบอร์โทร, LINE ID)
- ✅ ดูรายละเอียดลูกค้า
- ✅ Export ข้อมูลเป็น CSV (optional)
- ✅ Pagination

### **Table Display:**
| # | ชื่อ | เบอร์โทร | LINE ID | ออเดอร์ | ยอดซื้อรวม | วันที่สมัคร |
|---|-----|---------|---------|--------|-----------|-----------|
| 1 | John | 081-xxx | @john  | 5      | ฿2,500    | 02/09/26  |

---

## 🔗 5. Navigation Links

### **เพิ่มใน Header/Footer:**
- ✅ Header: เมนู "สมัครสมาชิก"
- ✅ Footer: Link "สมัครสมาชิก"
- ✅ Mobile menu: เพิ่ม link

### **ปุ่ม CTA:**
- ✅ หน้าแรก: Banner "สมัครสมาชิกรับสิทธิพิเศษ"

---

## 📦 6. Supabase Client Setup

### **File:** `/src/lib/supabase.ts`
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### **Environment Variables:**
```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## ✅ 7. Implementation Checklist

### **Phase 1: Setup Supabase**
- [ ] สร้าง Supabase project
- [ ] สร้าง `customers` table
- [ ] Setup Row Level Security (RLS)
- [ ] ได้ API keys

### **Phase 2: Frontend**
- [ ] สร้าง `/register` page
- [ ] สร้าง form component
- [ ] เพิ่ม validation
- [ ] เพิ่ม success/error handling

### **Phase 3: Backend**
- [ ] Setup Supabase client
- [ ] สร้าง API `/api/customers/register`
- [ ] สร้าง API `/api/admin/customers`

### **Phase 4: Admin Panel**
- [ ] สร้าง `/admin/customers` page
- [ ] แสดงตารางลูกค้า
- [ ] เพิ่ม search/filter
- [ ] เพิ่ม pagination

### **Phase 5: Integration**
- [ ] เพิ่ม link ใน Header
- [ ] เพิ่ม link ใน Footer
- [ ] เพิ่ม link ใน Mobile menu
- [ ] เพิ่ม CTA banner ในหน้าแรก

---

## 🎨 8. UI/UX Notes

- ✅ ใช้ Navy theme เหมือนหน้าอื่น
- ✅ Form fields มี focus state (เขียว)
- ✅ Error messages แสดงใต้ field
- ✅ Success message แสดง popup/toast
- ✅ Loading state ตอน submit

---

## ⚠️ 9. Security Notes

- ✅ Phone number unique (ไม่ให้สมัครซ้ำ)
- ✅ Validate input ทั้ง client และ server
- ✅ Rate limiting (ป้องกัน spam)
- ✅ Admin routes protected ด้วย middleware

---

## 📝 Notes for Implementation

**Priority:**
1. Setup Supabase table ก่อน
2. สร้างหน้า register
3. สร้าง API
4. สร้าง Admin page

**Testing:**
- ทดสอบสมัครสมาชิก
- ทดสอบ duplicate phone number
- ทดสอบ validation
- ทดสอบ admin panel

---

**สร้างโดย:** Qwen Code
**วันที่:** 2026-09-02
**สำหรับ:** AI อีกอันที่จะ implement
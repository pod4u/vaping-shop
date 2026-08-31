# 🗺️ VAPING SHOP - แผนพัฒนาระบบหลังบ้าน

เอกสารวางแผนการพัฒนาระบบ Admin Panel และ Backend API

---

## 📊 ภาพรวมสถาปัตยกรรม

```
┌─────────────────────────────────────────────────────────┐
│                    VAPING SHOP                           │
│                   (Single Project)                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📱 FRONTEND (Public)                                    │
│  ├── /                    → หน้าแรก (Landing Page)       │
│  ├── /products            → รายการสินค้า                │
│  ├── /products/[id]       → รายละเอียดสินค้า            │
│  └── /contact             → ติดต่อเรา                   │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  🔐 ADMIN PANEL (Protected)                              │
│  ├── /admin/login         → เข้าสู่ระบบ                 │
│  ├── /admin/dashboard     → หน้าหลัก                    │
│  ├── /admin/products      → จัดการสินค้า                │
│  ├── /admin/products/new  → เพิ่มสินค้า                 │
│  ├── /admin/orders        → รายการสั่งซื้อ               │
│  ├── /admin/customers     → รายชื่อลูกค้า                │
│  ├── /admin/categories    → จัดการหมวดหมู่               │
│  └── /admin/settings      → ตั้งค่าร้าน                  │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ⚡ API ROUTES                                            │
│  ├── /api/auth/login      → Login                       │
│  ├── /api/auth/logout     → Logout                      │
│  ├── /api/products        → CRUD Products               │
│  ├── /api/categories      → CRUD Categories             │
│  ├── /api/orders          → CRUD Orders                 │
│  └── /api/upload          → Upload images               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 โครงสร้างโปรเจค (แบบ Route Groups)

```
vaping-shop/
├── src/
│   ├── app/
│   │   │
│   │   ├── (public)/                    # 📱 หน้าร้าน
│   │   │   ├── page.tsx                 # หน้าแรก
│   │   │   ├── products/
│   │   │   │   ├── page.tsx             # รายการสินค้า
│   │   │   │   └── [id]/page.tsx        # รายละเอียด
│   │   │   └── layout.tsx               # Layout หน้าร้าน
│   │   │
│   │   ├── (admin)/                     # 🔐 ระบบหลังบ้าน
│   │   │   ├── login/page.tsx           # หน้า Login
│   │   │   ├── dashboard/page.tsx       # Dashboard
│   │   │   ├── products/
│   │   │   │   ├── page.tsx             # รายการสินค้า
│   │   │   │   ├── new/page.tsx         # เพิ่มสินค้า
│   │   │   │   └── [id]/page.tsx        # แก้ไขสินค้า
│   │   │   ├── orders/page.tsx          # รายการสั่งซื้อ
│   │   │   ├── customers/page.tsx       # ลูกค้า
│   │   │   ├── categories/page.tsx      # หมวดหมู่
│   │   │   ├── settings/page.tsx        # ตั้งค่า
│   │   │   └── layout.tsx               # Layout Admin (Auth)
│   │   │
│   │   ├── api/                         # ⚡ API Routes
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts
│   │   │   │   └── logout/route.ts
│   │   │   ├── products/route.ts
│   │   │   ├── categories/route.ts
│   │   │   ├── orders/route.ts
│   │   │   └── upload/route.ts
│   │   │
│   │   └── layout.tsx                   # Root Layout
│   │
│   ├── components/
│   │   ├── public/                      # Components หน้าร้าน
│   │   │   ├── Header.tsx
│   │   │   ├── ProductCard.tsx
│   │   │   └── ...
│   │   │
│   │   └── admin/                       # Components Admin
│   │       ├── Sidebar.tsx
│   │       ├── Navbar.tsx
│   │       ├── ProductTable.tsx
│   │       ├── OrderTable.tsx
│   │       ├── ProductForm.tsx
│   │       └── ...
│   │
│   ├── lib/
│   │   ├── config.ts                    # Config ร้าน
│   │   ├── auth.ts                      # Auth utilities
│   │   ├── db.ts                        # Database connection
│   │   └── utils.ts                     # Helper functions
│   │
│   └── types/
│       ├── product.ts
│       ├── order.ts
│       ├── user.ts
│       └── api.ts
│
├── prisma/                              # Database schema
│   └── schema.prisma
│
└── .env.local                           # Environment variables
```

---

## 🗄️ Database Schema

### Tables

```sql
-- 👤 Users (Admin/Staff)
CREATE TABLE users (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password      VARCHAR(255) NOT NULL,
  name          VARCHAR(255),
  role          ENUM('admin', 'staff') DEFAULT 'staff',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 📦 Products
CREATE TABLE products (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  name          VARCHAR(255) NOT NULL,
  slug          VARCHAR(255) UNIQUE NOT NULL,
  description   TEXT,
  price         DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  image         VARCHAR(500),
  category_id   INT,
  features      JSON,
  stock         INT DEFAULT 0,
  is_featured   BOOLEAN DEFAULT FALSE,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- 🏷️ Categories
CREATE TABLE categories (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  name          VARCHAR(255) NOT NULL,
  name_th       VARCHAR(255) NOT NULL,
  slug          VARCHAR(255) UNIQUE NOT NULL,
  icon          VARCHAR(50),
  description   TEXT,
  sort_order    INT DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 🛒 Orders
CREATE TABLE orders (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  order_number  VARCHAR(50) UNIQUE NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_line VARCHAR(100),
  customer_phone VARCHAR(20),
  total         DECIMAL(10,2) NOT NULL,
  status        ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
  notes         TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 📋 Order Items
CREATE TABLE order_items (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  order_id      INT NOT NULL,
  product_id    INT NOT NULL,
  quantity      INT NOT NULL,
  price         DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ⚙️ Settings
CREATE TABLE settings (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  key           VARCHAR(100) UNIQUE NOT NULL,
  value         TEXT,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## 🔐 Security Plan

### Authentication Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Login     │───▶│   Verify    │───▶│   Session   │
│   Page      │    │   Password  │    │   Cookie    │
└─────────────┘    └─────────────┘    └─────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │    2FA      │
                   │  (Optional) │
                   └─────────────┘
```

### Security Layers

| Layer | Method | Priority |
|-------|--------|----------|
| **URL Hidden** | ใช้ path ซับซ้อน เช่น `/admin-panel-xyz123` | ⭐⭐⭐ |
| **Authentication** | Login + Password ที่เข้ารหัส | ⭐⭐⭐ |
| **Session Management** | JWT + HttpOnly Cookie | ⭐⭐⭐ |
| **CSRF Protection** | Token validation | ⭐⭐ |
| **Rate Limiting** | จำกัด login attempts | ⭐⭐ |
| **2FA** | OTP via LINE/SMS | ⭐ |
| **IP Whitelist** | อนุญาตเฉพาะ IP ที่กำหนด | ⭐ |

### Middleware Protection

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // ตรวจสอบทุก path ที่ขึ้นต้นด้วย /admin
  if (pathname.startsWith('/admin-panel-xyz123')) {
    const session = request.cookies.get('admin_session');
    
    // ถ้าไม่มี session ให้ redirect ไป login
    if (!session && !pathname.includes('/login')) {
      return NextResponse.redirect(new URL('/admin-panel-xyz123/login', request.url));
    }
  }
  
  return NextResponse.next();
}
```

---

## 📱 Admin Features

### Dashboard

| Widget | รายละเอียด |
|--------|-----------|
| **ยอดขายวันนี้** | แสดงยอดขายรวม |
| **ออเดอร์ใหม่** | จำนวนออเดอร์ที่รอดำเนินการ |
| **สินค้าใกล้หมด** | แจ้งเตือนสินค้าที่เหลือน้อย |
| **กราฟยอดขาย** | แสดงยอดขาย 7 วัน/30 วัน |

### Product Management

- [ ] ดูรายการสินค้าทั้งหมด
- [ ] เพิ่มสินค้าใหม่
- [ ] แก้ไขสินค้า
- [ ] ลบสินค้า
- [ ] อัปโหลดรูปภาพ
- [ ] ตั้งค่าส่วนลด
- [ ] จัดการ stock

### Order Management

- [ ] ดูรายการสั่งซื้อ
- [ ] เปลี่ยนสถานะออเดอร์
- [ ] พิมพ์ใบสั่งซื้อ
- [ ] ส่งข้อความแจ้งเตือน LINE

### Category Management

- [ ] เพิ่ม/แก้ไข/ลบหมวดหมู่
- [ ] เรียงลำดับหมวดหมู่

### Settings

- [ ] ตั้งค่าชื่อร้าน
- [ ] เปลี่ยน LINE ID
- [ ] ตั้งค่าส่งฟรี
- [ ] เปลี่ยน password

---

## 🛠️ Tech Stack Options

### Option A: Next.js Full Stack (แนะนำ)

| ส่วน | เทคโนโลยี |
|------|----------|
| Frontend | Next.js 14 + React |
| Admin | Next.js 14 + React |
| API | Next.js API Routes |
| Database | Supabase (PostgreSQL) |
| Auth | NextAuth.js / Custom JWT |
| ORM | Prisma |
| Hosting | Vercel |

**ข้อดี:** โปรเจคเดียว จัดการง่าย ฟรี hosting

---

### Option B: Separate Backend

| ส่วน | เทคโนโลยี |
|------|----------|
| Frontend | Next.js |
| Admin | Next.js (โปรเจคแยก) |
| API | Node.js + Express |
| Database | MySQL / PostgreSQL |
| Auth | JWT |
| Hosting | VPS / DigitalOcean |

**ข้อดี:** แยกสิทธิ์ชัดเจน ปลอดภัยกว่า

---

## 📅 Timeline

### Phase 1: Setup (1-2 days)
- [ ] ตั้งค่าโครงสร้างโปรเจค
- [ ] เชื่อมต่อ Database
- [ ] สร้าง Prisma schema

### Phase 2: Authentication (2-3 days)
- [ ] ระบบ Login/Logout
- [ ] Session management
- [ ] Middleware protection

### Phase 3: Admin Dashboard (3-5 days)
- [ ] Layout admin
- [ ] Dashboard widgets
- [ ] Sidebar navigation

### Phase 4: CRUD Products (3-4 days)
- [ ] Product list
- [ ] Add/Edit product form
- [ ] Image upload
- [ ] Category management

### Phase 5: Orders (2-3 days)
- [ ] Order list
- [ ] Order detail
- [ ] Status update

### Phase 6: Polish (1-2 days)
- [ ] Settings page
- [ ] Error handling
- [ ] Loading states
- [ ] Testing

---

## 🌐 Deployment Options

### Option A: Vercel (แนะนำสำหรับเริ่มต้น)

```
Frontend:  https://vaping-shop.vercel.app
Admin:     https://vaping-shop.vercel.app/admin-xyz
API:       https://vaping-shop.vercel.app/api
```

- ✅ ฟรี
- ✅ ตั้งค่าง่าย
- ⚠️ Serverless (มีข้อจำกัด)

### Option B: VPS (DigitalOcean/Vultr)

```
Frontend:  https://vaping-shop.com
Admin:     https://admin.vaping-shop.com
API:       Internal
```

- ✅ ควบคุมได้เต็มที่
- ✅ ปลอดภัยกว่า
- ⚠️ ต้องจัดการเอง

### Option C: Cloudflare Pages + Workers

- ✅ ฟรี
- ✅ เร็ว
- ⚠️ ซับซ้อนกว่า

---

## 📝 Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."

# Auth
JWT_SECRET="your-super-secret-key"
ADMIN_SECRET_PATH="admin-xyz123"

# LINE (สำหรับแจ้งเตือน)
LINE_CHANNEL_ACCESS_TOKEN="..."
LINE_CHANNEL_ID="..."

# Upload (สำหรับอัปโหลดรูป)
# Option 1: Cloudinary
CLOUDINARY_URL="cloudinary://..."

# Option 2: Supabase Storage
SUPABASE_URL="..."
SUPABASE_ANON_KEY="..."

# App
NEXT_PUBLIC_STORE_NAME="VAPING SHOP"
NEXT_PUBLIC_LINE_ID="@your-line-id"
```

---

## 🚀 เริ่มต้น

เมื่อพร้อมพัฒนา รันคำสั่งนี้:

```bash
# 1. Install dependencies
npm install prisma @prisma-client bcryptjs jsonwebtoken

# 2. Setup database
npx prisma init
npx prisma db push

# 3. Create admin user
npx prisma studio
```

---

## 📌 Notes

- Admin path ใช้ชื่อซับซ้อน เช่น `/admin-panel-xyz123` แทน `/admin`
- ใช้ HTTPS เท่านั้น
- Backup database สม่ำเสมอ
- ตรวจสอบ log การเข้าระบบ

---

**สร้างเมื่อ:** August 25, 2026  
**อัปเดตล่าสุด:** August 25, 2026
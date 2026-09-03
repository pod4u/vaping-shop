-- LEGACY REFERENCE ONLY.
-- The active catalog schema is maintained in:
-- supabase/migrations/20260902164434_product_catalog_storage.sql

-- ============================================
-- 1. BRANDS (แบรนด์สินค้า)
-- ============================================
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,          -- "MSW", "MOOD", "ALFA"
  name_th VARCHAR(100),                        -- ชื่อภาษาไทย
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,                             -- รูปแบนเนอร์
  color VARCHAR(20),                           -- สีประจำแบรนด์ (#hex)
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. CATEGORIES (หมวดหมู่)
-- ============================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,          -- "POD", "DISPOSABLE"
  name_th VARCHAR(100) NOT NULL,              -- "พอด", "พอตใช้แล้วทิ้ง"
  icon VARCHAR(50),                           -- emoji icon
  slug VARCHAR(100) UNIQUE,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. FLAVORS (รสชาติ)
-- ============================================
CREATE TABLE flavors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,                 -- "Watermelon", "Blueberry"
  name_th VARCHAR(100),                       -- "แตงโม", "บลูเบอร์รี่"
  color VARCHAR(20),                          -- สีประจำรส
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. PRODUCTS (สินค้า)
-- ============================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku VARCHAR(50) UNIQUE,                     -- รหัสสินค้า
  name VARCHAR(200) NOT NULL,                 -- "MSW Head Change"
  name_th VARCHAR(200),                       -- "หัวเปลี่ยน MSW"
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT,
  image_url TEXT,
  price DECIMAL(10,2) NOT NULL,               -- ราคาปกติ
  sale_price DECIMAL(10,2),                   -- ราคาโปรโมชั่น
  puff_count INT,                             -- จำนวน puff (14k, 16k, 20k)
  nicotine_level DECIMAL(3,1),                -- นิโคติน (0.5, 1.0, 2.0, 3.0)
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. PRODUCT FLAVORS (รสชาติของแต่ละสินค้า)
-- ============================================
CREATE TABLE product_flavors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  flavor_id UUID REFERENCES flavors(id) ON DELETE CASCADE,
  stock_quantity INT DEFAULT 0,               -- จำนวนสต็อกของรสนี้
  is_available BOOLEAN DEFAULT true,          -- พร้อมส่ง?
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, flavor_id)
);

-- ============================================
-- 6. STOCK LOG (บันทึกการเปลี่ยนแปลงสต็อก)
-- ============================================
CREATE TABLE stock_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_flavor_id UUID REFERENCES product_flavors(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL,                -- "ADD", "REMOVE", "SOLD"
  quantity INT NOT NULL,                      -- จำนวนที่เปลี่ยน
  previous_quantity INT,
  new_quantity INT,
  note TEXT,                                  -- หมายเหตุ
  created_by VARCHAR(100),                    -- admin ผู้ทำรายการ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 7. CUSTOMERS (ลูกค้า)
-- ============================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id VARCHAR(100) UNIQUE,           -- Line User ID
  name VARCHAR(200),
  phone VARCHAR(20),
  address TEXT,
  total_orders INT DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 8. ORDERS (คำสั่งซื้อ)
-- ============================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(20) UNIQUE,            -- "VS-2024082801"
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'PENDING',       -- PENDING, CONFIRMED, PAID, SHIPPED, DELIVERED, CANCELLED
  total_amount DECIMAL(12,2) NOT NULL,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  final_amount DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(50),                 -- "QR", "BANK_TRANSFER"
  payment_slip_url TEXT,                      -- รูปสลิป
  payment_verified BOOLEAN DEFAULT false,
  payment_verified_at TIMESTAMP WITH TIME ZONE,
  shipping_name VARCHAR(200),
  shipping_phone VARCHAR(20),
  shipping_address TEXT,
  tracking_number VARCHAR(50),                -- เลขพัสดุ
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 9. ORDER ITEMS (รายการสินค้าในคำสั่งซื้อ)
-- ============================================
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  flavor_id UUID REFERENCES flavors(id) ON DELETE SET NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 10. ADMIN USERS (ผู้ดูแลระบบ)
-- ============================================
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(200) UNIQUE NOT NULL,
  password_hash VARCHAR(200),
  name VARCHAR(200),
  role VARCHAR(50) DEFAULT 'ADMIN',           -- ADMIN, STAFF
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 11. LINE MESSAGES LOG (บันทึกข้อความ Line)
-- ============================================
CREATE TABLE line_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  line_user_id VARCHAR(100),
  message_type VARCHAR(50),                   -- "TEXT", "IMAGE", "STICKER"
  message_text TEXT,
  direction VARCHAR(20),                      -- "INCOMING", "OUTGOING"
  is_processed BOOLEAN DEFAULT false,
  ai_response TEXT,                           -- คำตอบจาก AI
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_product_flavors_product ON product_flavors(product_id);
CREATE INDEX idx_product_flavors_flavor ON product_flavors(flavor_id);
CREATE INDEX idx_stock_logs_created ON stock_logs(created_at DESC);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_line_messages_user ON line_messages(line_user_id);
CREATE INDEX idx_customers_line_id ON customers(line_user_id);

-- ============================================
-- SAMPLE DATA
-- ============================================

-- Insert Brands
INSERT INTO brands (name, name_th, color, sort_order) VALUES
('MSW', 'MSW', '#8B5CF6', 1),
('MOOD', 'MOOD 14K', '#EC4899', 2),
('ALFA', 'ALFA DUO MESH 20K', '#3B82F6', 3),
('VPLUS', 'V-PLUS 16K', '#10B981', 4);

-- Insert Categories
INSERT INTO categories (name, name_th, icon, slug) VALUES
('POD_SYSTEM', 'ระบบพอด', '💨', 'pod-system'),
('DISPOSABLE', 'พอตใช้แล้วทิ้ง', '🚬', 'disposable'),
('POD_HEAD', 'หัวเปลี่ยน', '🔄', 'pod-head'),
('ACCESSORY', 'อุปกรณ์เสริม', '⚡', 'accessory');

-- Insert Flavors
INSERT INTO flavors (name, name_th, color) VALUES
('WATERMELON', 'แตงโม', '#FF6B6B'),
('WATERMELON_BUBBLEGUM', 'แตงโมบับเบิ้ลกั้ม', '#FF8E8E'),
('BLUEBERRY', 'บลูเบอร์รี่', '#4F46E5'),
('GRAPE', 'องุ่น', '#9333EA'),
('KYOTO_GRAPE', 'เคียวโฮ', '#7C3AED'),
('LYCHEE_GRAPE', 'องุ่นลิ้นจี่', '#A855F7'),
('GRAPE_ALOE', 'องุ่นอโล', '#8B5CF6'),
('MIXBERRY', 'มิกซ์เบอร์รี่', '#6366F1'),
('MINT', 'มิ้น', '#22D3EE'),
('BLUE_ICE', 'บลูไอซ์', '#06B6D4'),
('GREEN_APPLE', 'แอปเปิ้ลเขียว', '#22C55E'),
('PEACH_STRAWBERRY', 'พีชสตอเบอรี่', '#F472B6'),
('RAINBOW_CANDY', 'เรนโบว์แคนดี้', '#EC4899'),
('DOUBLE_APPLE', 'ดับเบิ้ลแอปเปิ้ล', '#84CC16'),
('MINERAL', 'มิเนรัล', '#94A3B8'),
('SUGAR_APPLE', 'ซูกัสแอปเปิ้ล', '#FDE047');

-- Enable Row Level Security (RLS)
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE flavors ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_flavors ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Public read policies (everyone can read active products)
CREATE POLICY "Public read brands" ON brands FOR SELECT USING (is_active = true);
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (is_active = true);
CREATE POLICY "Public read flavors" ON flavors FOR SELECT USING (is_active = true);
CREATE POLICY "Public read products" ON products FOR SELECT USING (is_active = true);
CREATE POLICY "Public read product flavors" ON product_flavors FOR SELECT USING (is_available = true);

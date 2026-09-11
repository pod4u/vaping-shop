# Design Specification — Pod4U

**สถานะ:** ✅ Batch 0 Completed | ✅ Batch 1A–1D Completed | ✅ Batch 3A–3B Completed | ✅ Batch 4–6 Completed | ✅ Batch 7–7A Core Applied and Verified — Source Activation Pending | ✅ Batch 8A–8B Deployed | 🟡 Batch 9A Thunder Activated — Real LINE/Slip UAT Pending | ✅ Batch 9B Member Session Deployed/Verified | ✅ Codex MCP Verified

---

## 1. Current System

| รายการ | ค่า |
|--------|-----|
| Stack | Next.js 14, React 18, Supabase |
| Existing Tables | customers, products, product_flavors, flavors, brands, categories, product_aliases, consent_logs |
| `customers.id` | **INTEGER** (int4) — ห้ามเปลี่ยนเป็น UUID |
| Batch 0 | ✅ Browser Draft Cart (localStorage), React Context, LINE handoff |

---

## 2. Architecture

```
Frontend (Catalog)          Supabase
├── products             ├── customers (INTEGER PK)
├── stock                ├── customer_identities (UUID PK, INTEGER FK)
└── Browser Cart         ├── customer_addresses
    (localStorage)       ├── orders + order_items
                        └── stock_reservations + ledger
```

**⚠️ MVP:** Browser Cart ใช้ localStorage | การเปิด LINE **ไม่ใช่การสั่งซื้อ** | Order creation เกิดที่ backend เท่านั้น

---

## 3. Design Decisions (Locked)

| รายการ | ค่า |
|--------|-----|
| `customers.id` | `INTEGER` — existing table |
| `customer_id` in new tables | `INTEGER NOT NULL` |
| PK in new tables | `UUID` |
| `provider_account_id` | `TEXT NOT NULL` — namespace, ห้าม NULL |

---

## 4. Proposed Tables

### customer_identities

```sql
CREATE TABLE customer_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  provider TEXT NOT NULL,                  -- 'line', 'phone', 'email'
  provider_account_id TEXT NOT NULL,       -- LINE Channel ID, ห้าม NULL
  provider_user_id TEXT NOT NULL,          -- LINE user ID
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'revoked')),
  verified_at TIMESTAMPTZ,
  verified_by TEXT,
  revoked_at TIMESTAMPTZ,
  provider_metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(provider, provider_account_id, provider_user_id),
  CHECK (provider_account_id <> ''),
  CHECK (provider_user_id <> '')
);
```

**⚠️ `provider_account_id` เป็น namespace ต้องไม่เป็น NULL เพื่อป้องกัน identity ซ้ำข้าม OA**

### Provider Namespace Rules

- `provider_account_id` ต้องเป็น `TEXT NOT NULL`
- ห้ามใช้ empty string
- `provider = 'line'` → ใช้ LINE Channel ID หรือ OA account identifier จริง
- `provider = 'phone'` → ใช้ namespace คงที่ของระบบ เช่น `pod4u`
- `provider = 'email'` → ใช้ namespace คงที่ของระบบ เช่น `pod4u`
- provider อื่นต้องกำหนด namespace ที่แน่นอนก่อนใช้งาน
- Identity uniqueness ใช้: provider + provider_account_id + provider_user_id
- LINE user ID ห้ามใช้เป็น customer primary key
- ห้ามสร้าง identity ซ้ำสำหรับ tuple เดียวกัน
- identity เก่าห้ามลบ ให้ใช้สถานะ `revoked`
- การเปลี่ยน LINE OA ต้องสร้าง identity ใหม่ที่ผูกกับ customer_id เดิมหลัง verification

**⚠️ SQL ปัจจุบันเป็น Design Draft ยังไม่พร้อม apply**

### customer_addresses

```sql
CREATE TABLE customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  recipient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  province TEXT NOT NULL,
  postal_code TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### orders

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  source_customer_identity_id UUID REFERENCES customer_identities(id),
  order_source TEXT NOT NULL DEFAULT 'admin_manual',
  -- Shipping snapshot
  shipping_name TEXT NOT NULL,
  shipping_phone TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  shipping_province TEXT NOT NULL,
  -- Status & Pricing
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  subtotal NUMERIC NOT NULL CHECK (subtotal >= 0),
  total NUMERIC NOT NULL CHECK (total >= 0),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### order_items

```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_flavor_id UUID REFERENCES product_flavors(id),
  product_name TEXT NOT NULL,
  flavor_name TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  sku TEXT,
  unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total_price NUMERIC NOT NULL CHECK (total_price >= 0)
);
```

### stock_reservations

```sql
CREATE TABLE stock_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_flavor_id UUID NOT NULL REFERENCES product_flavors(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'confirmed', 'released', 'expired')),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 minutes')
);
```

### stock_ledger

```sql
CREATE TABLE stock_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_flavor_id UUID NOT NULL REFERENCES product_flavors(id),
  action TEXT NOT NULL CHECK (action IN ('stock_import', 'reservation', 'sale', 'manual_adjustment', 'return')),
  quantity_delta INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL CHECK (previous_quantity >= 0),
  new_quantity INTEGER NOT NULL CHECK (new_quantity >= 0),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### customer_identity_link_tokens (Implemented in Batch 1D)

```sql
CREATE TABLE customer_identity_link_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,              -- hash, ไม่เก็บ plaintext
  expires_at TIMESTAMPTZ NOT NULL,       -- 10 นาที
  used_at TIMESTAMPTZ,
  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 5. Order Lifecycle

```
1. ลูกค้าเลือกสินค้า → localStorage Draft Cart
2. กด "คัดลอกรายการ" → **ไม่มี Order ถูกสร้าง**
3. กด "เปิด LINE OA" → เปิด LINE เท่านั้น, **ห้ามล้าง Cart**
4. ลูกค้าวางข้อความใน LINE ด้วยตนเอง
5. แอดมินรับรายการ → verification flow
6. หลัง verify → แอดมินสร้าง Order (transaction: orders + order_items + stock_reservations)
7. ยืนยัน → confirmed → stock_ledger
8. จัดส่ง → shipped → tracking
9. สำเร็จ → delivered
```

**⚠️ การคัดลอกข้อความหรือเปิด LINE ไม่ใช่การสร้างคำสั่งซื้อ**

---

## 6. Verification Flow (MVP)

**ห้ามใช้:** ประวัติการซื้อ, ที่อยู่เดิม, ข้อมูลที่เดาได้

**วิธี:** One-time Linking Code

```
1. ลูกค้าแจ้งเบอร์ใน LINE OA
2. แอดมินค้นหาโดยไม่เปิดเผยข้อมูลเดิม
3. ระบบสร้าง one-time code (10 นาที, hash)
4. แอดมินโทรไปเบอร์เดิมในระบบ แจ้ง code
5. ลูกค้าส่ง code ผ่าน LINE
6. Backend verify → create identity
```

**ข้อกำหนด:**
- ห้ามส่ง code ไปเบอร์ที่ลูกค้าพิมพ์มา → ต้องส่งไปเบอร์เดิมในระบบ
- Code เก็บแบบ hash, ห้าม log plaintext
- Audit trail ทุกการ verify

### One-time Token Security Rules

**Code Generation:**
- Code ต้องสร้างด้วย cryptographically secure random generator
- Code มีอายุไม่เกิน 10 นาที
- Code ใช้ได้ครั้งเดียว
- เก็บเฉพาะ `token_hash` ห้ามเก็บ plaintext code
- ห้าม log plaintext code
- Hash ต้องใช้ keyed HMAC หรือ password-hashing method ที่เหมาะสม
- Secret สำหรับ HMAC ต้องเก็บเฉพาะ server environment
- ห้ามใช้ `NEXT_PUBLIC_*` สำหรับ secret

**Token Binding:**
- Token ต้องผูกกับ: customer_id, provider, provider_account_id, provider_user_id
- อนุญาต active token ได้เพียงหนึ่งรายการต่อ identity-linking attempt
- เมื่อสร้าง token ใหม่ ให้ยกเลิก token เก่าที่ยังไม่หมดอายุ

**Verification Checks:**
- token hash ตรงกัน
- ยังไม่หมดอายุ
- `used_at IS NULL`
- ยังไม่ถูก lock
- customer_id, provider, provider_account_id, provider_user_id ตรง

**Failed Attempts:**
- กรอกผิดได้ไม่เกิน 5 ครั้ง
- เมื่อผิดให้เพิ่ม `failed_attempts` แบบ atomic
- เมื่อครบกำหนดให้ตั้ง `locked_until`
- ห้ามบอกว่าผิดเพราะ customer, code หรือ LINE identity ไม่ตรง
- ใช้ข้อความ error กลางเพื่อป้องกัน account enumeration

**On Success:**
- การ consume token ต้องเป็น atomic operation
- ตั้ง `used_at`
- สร้าง/อัปเดต customer identity เป็น `verified`
- บันทึก `verified_at`, `verified_by`
- บันทึก audit log

**Edge Cases:**
- Token ที่หมดอายุต้องมี cleanup process
- ถ้าไม่มีเบอร์เดิมที่เชื่อถือได้ในระบบ → ห้าม auto-link → เข้าสู่ manual review หรือสร้าง customer ใหม่

**⚠️ ห้ามส่ง code ไปยังเบอร์ที่ลูกค้าเพิ่งพิมพ์ผ่าน LINE**
**⚠️ ต้องโทรหรือส่งไปยังข้อมูลติดต่อเดิมที่เชื่อถือได้เท่านั้น**
**⚠️ ห้ามเปิดเผยชื่อเต็ม ที่อยู่ หรือประวัติคำสั่งซื้อก่อน verification**

### Identity Verification Audit Requirements

Audit log ต้องบันทึก:
- event type
- customer_id
- provider
- provider_account_id
- provider_user_id แบบ mask หากแสดงใน UI
- token record id โดยไม่บันทึก plaintext token
- ผู้สร้าง verification request
- ผู้อนุมัติ
- จำนวนครั้งที่ล้มเหลว
- created_at, verified_at, revoked_at
- request IP และ user agent แบบจำกัดการเข้าถึง หากมีการเก็บ

**ห้ามบันทึก:**
- plaintext token
- ที่อยู่เต็มใน log
- เนื้อหา LINE message ทั้งหมด
- service-role key หรือ secrets

---

## 7. Prerequisites (Batch 1A)

**วันที่ตรวจ:** 7 กันยายน 2026  
**ขอบเขต:** READ-ONLY metadata verification ผ่าน Supabase MCP ของ Codex

| รายการ | สถานะ |
|--------|--------|
| Codex Supabase MCP connection | ✅ Verified |
| `list_projects` | ✅ Passed — พบ `pod4u's Project` |
| Project ref | ✅ `puslxgriozubqlpoxrqo` |
| Region / health | ✅ `ap-southeast-2` / `ACTIVE_HEALTHY` |
| `list_tables` (`public`, verbose) | ✅ Passed — 8 tables |
| `list_migrations` | ✅ Passed — remote migrations 0 |
| Local migration files | ✅ 1 file (`20260902164434_product_catalog_storage.sql`) |
| `customers.id` | ✅ Verified via MCP — `integer` / `int4`, primary key |
| RLS metadata | ✅ Verified — เปิด RLS ทั้ง 8 tables |
| Policy metadata | ✅ Verified via metadata-only SQL |
| Security advisors | ✅ Completed — 1 INFO finding |
| Performance advisors | ✅ Completed — 6 INFO findings |
| Supabase documentation search | ✅ Passed |
| Qwen Supabase MCP connection | ❌ Unavailable ตาม diagnostic เดิม — ห้ามใช้ Qwen ทำ database operation จนกว่าจะตรวจใหม่ |
| ผู้ใช้อนุมัติเริ่ม Batch 1A | ⏳ Pending |

### MCP Verification Evidence

MCP tools ที่เรียกสำเร็จจริง:

- `mcp__codex_apps__supabase_list_projects`
- `mcp__codex_apps__supabase_get_project`
- `mcp__codex_apps__supabase_list_tables`
- `mcp__codex_apps__supabase_list_migrations`
- `mcp__codex_apps__supabase_get_advisors` (`security` และ `performance`)
- `mcp__codex_apps__supabase_search_docs`
- `mcp__codex_apps__supabase_execute_sql` — ใช้เฉพาะ `pg_policies` และ `information_schema.role_table_grants`

ผล schema metadata:

- พบ `customers`, `consent_logs`, `brands`, `categories`, `flavors`, `products`, `product_flavors`, `product_aliases`
- ไม่พบ `customer_identities`, `customer_addresses`, `orders`, `order_items`, `stock_reservations`, `stock_ledger`
- ไม่มีการอ่าน row จาก `public.customers`
- ไม่มีการแก้ schema, data หรือ migration history

ผล RLS/policies:

- ทุกตารางใน `public` เปิด RLS
- Catalog tables มี public SELECT policies สำหรับ `anon`/`authenticated`
- `consent_logs` และ `product_aliases` มี service-role policies
- `customers` ไม่มี policy สำหรับ non-service roles และอยู่ในสภาพ deny-by-default
- Security Advisor รายงาน `rls_enabled_no_policy` ที่ `public.customers` ระดับ INFO; ต้องตัดสิน policy โดยเจตนาก่อนเปิด Customer API

ผล Performance Advisor:

- พบ unused-index notices ระดับ INFO จำนวน 6 รายการ
- ยังไม่ลบ index จากผลนี้ เพราะฐานข้อมูลมีข้อมูล/traffic น้อยและงานนี้เป็น READ-ONLY verification

Documentation search ผ่านสำหรับ RLS, Data API grants, database functions/transactions, `SECURITY DEFINER` security และ MCP authentication/setup

**เงื่อนไข:** หาก Codex เป็นผู้ทำ Batch 1A สามารถใช้ผล verification นี้ได้ หากเปลี่ยนกลับไปใช้ Qwen ทำ database operation ต้องตรวจ MCP ใน Qwen session ใหม่ก่อน

---

## 8. Supabase Security and Migration Gate

### RLS Requirements

- เปิด RLS ทุกตารางใหม่ใน `public`
- ใช้ deny-by-default
- ห้ามให้ `anon` อ่าน: customer_identities, customer_identity_link_tokens, customer_addresses, orders, order_items, stock_reservations, stock_ledger
- `authenticated` อย่างเดียวไม่ถือว่าเป็น authorization
- Policy ต้องตรวจ ownership หรือ admin permission
- UPDATE policy ต้องมีทั้ง `USING` และ `WITH CHECK`
- ห้ามใช้ `user_metadata` เป็นข้อมูลตัดสินสิทธิ์
- ถ้าใช้ Supabase Auth roles → เก็บ role ใน trusted app metadata หรือ admin profile table
- Data API grants เป็นคนละเรื่องกับ RLS ต้องตรวจทั้งสองส่วน
- ห้ามสร้าง policy แบบ allow-all

### Service-role Requirements

- Service-role key ใช้เฉพาะ server-side API
- ห้ามส่ง service-role key ไป browser
- ห้ามตั้งชื่อ environment variable ด้วย `NEXT_PUBLIC_*`
- ทุก API ที่ใช้ service role ต้องตรวจ authentication และ authorization ก่อน query
- ห้ามเชื่อ input จาก browser, LINE webhook หรือ admin form โดยไม่ validate
- LINE webhook ต้องตรวจ signature ก่อนประมวลผล

### Database Function Requirements

- Atomic Order + Order Items + Stock Reservation ต้องทำใน transaction/RPC เดียว
- Prefer `SECURITY INVOKER`
- ห้ามเพิ่ม `SECURITY DEFINER` เพียงเพื่อแก้ permission error
- หากจำเป็นต้องใช้ `SECURITY DEFINER`:
  - อยู่ใน non-exposed schema
  - ตรวจ caller/admin ใน function
  - กำหนด `search_path` อย่างปลอดภัย
  - revoke EXECUTE จาก PUBLIC
  - grant เฉพาะ role ที่จำเป็น
- ต้องป้องกัน overselling ด้วย row locking หรือ atomic conditional update
- Retry ต้องไม่สร้าง order หรือ ledger ซ้ำ
- ใช้ idempotency key สำหรับการสร้าง order จาก LINE/webhook

### Required Indexes

ก่อน migration ต้องออกแบบ index อย่างน้อย:
- `customer_identities(customer_id)`
- `customer_identities(provider, provider_account_id, provider_user_id)`
- `customer_identities(status)`
- `customer_identity_link_tokens(customer_id)`
- `customer_identity_link_tokens(provider, provider_account_id, provider_user_id)`
- `customer_identity_link_tokens(expires_at)`
- `orders(customer_id)`
- `orders(status)`
- `orders(order_number)`
- `order_items(order_id)`
- `stock_reservations(order_id)`
- `stock_reservations(product_flavor_id, status)`
- `stock_reservations(expires_at)`
- `stock_ledger(product_flavor_id, created_at)`

**ต้องตรวจ duplicate index ก่อนสร้างจริง**

### Constraints Required Before Migration

- Foreign Key สำคัญต้องเป็น `NOT NULL`
- CHECK quantity > 0
- CHECK ราคาไม่ติดลบ
- CHECK status ตาม allowed states
- CHECK provider_account_id และ provider_user_id ไม่เป็น empty string
- กำหนด ON DELETE ทุก Foreign Key
- timestamps สำคัญควรเป็น `NOT NULL DEFAULT now()`
- ป้องกัน default address ซ้ำต่อ customer
- ป้องกัน active linking token ซ้ำต่อ identity attempt
- ป้องกัน reservation ซ้ำสำหรับ order item เดียวกัน
- ป้องกัน order number ซ้ำ
- กำหนด idempotency key uniqueness สำหรับ LINE/webhook intake

### Migration Gate

**ก่อนสร้าง migration:**
- Agent ที่ทำ database operation ต้องมี Supabase MCP verification ใน session ของตนเอง; Codex ผ่านแล้ว ส่วน Qwen ต้องตรวจใหม่ก่อนใช้งาน
- list_projects ต้องสำเร็จ
- ต้องพบ project Pod4U และยืนยัน project ref
- list_tables ต้องสำเร็จ
- list_migrations ต้องสำเร็จ
- ตรวจชนิด customers.id ซ้ำ
- ตรวจ Foreign Key types จริง
- ตรวจ RLS และ policies ปัจจุบัน
- ตรวจ Data API exposure/grants
- ตรวจ duplicate tables, indexes และ constraints
- ตรวจ Supabase changelog และ documentation ที่เกี่ยวข้อง
- ผู้ใช้ต้องอนุมัติ Design Lock

**ระหว่างสร้าง migration:**
- สร้าง migration file ผ่าน Supabase CLI command ที่ถูกต้อง
- ห้าม invent migration filename
- ห้าม apply migration ในงาน Design Lock
- migration ต้องทำงานซ้ำอย่างปลอดภัยหรือ fail อย่างชัดเจน
- แยก schema change ออกจาก data backfill เมื่อเหมาะสม

**Recovery plan:**
- ระบุวิธีกู้คืนก่อน apply
- สำรอง schema และข้อมูลที่เกี่ยวข้อง
- ใช้ compensating/forward migration สำหรับ rollback เมื่อเหมาะสม
- ห้ามลบตารางหรือข้อมูลเดิมใน migration แรก
- `customers.line_id` เดิมต้องเก็บไว้ก่อน
- ห้าม backfill LINE identity จาก phone number อย่างเดียว
- ต้องตรวจ row counts และ referential integrity หลัง migration

**หลัง migration:**
- ตรวจ Supabase advisors
- ตรวจ RLS
- ตรวจ policies
- ตรวจ indexes
- ตรวจ migrations history
- ทำ test query แบบไม่อ่านข้อมูลลูกค้าเกินจำเป็น
- บันทึกผล verification ลงรายงาน

---

## 9. Implementation Batches

| Batch | เป้าหมาย | สถานะ |
|-------|---------|--------|
| 0 | Browser Draft Cart | ✅ Done |
| 1A | customer_identities | ✅ Applied and Verified |
| 1B | customer_addresses | ✅ Applied and Verified |
| 1C | Customer APIs | ✅ Applied and Verified |
| 1D | LINE Verification | ✅ Applied and Verified |
| 3A | Order Intake | ✅ Applied and Verified |
| 3B | Atomic Order Reservation | ✅ Applied and Verified |
| 4 | Confirm Order + Stock Ledger | ✅ Applied and Verified |
| 5 | LINE Webhook Order Intake | ✅ Implemented and Verified |
| 6 | Admin Roles + Order Operations | ✅ Applied and Verified |
| 7 | Nightly Stock Import Staging | 🟡 Core Applied and Verified; Google source activation pending |
| 7A | Admin Cron Monitoring | ✅ Applied and Verified; production deployment pending |
| 8A | LINE Self-registration + Rich Menu v2 | ✅ Core Applied and Verified; production deployment and Rich Menu publish pending |

### Batch 1A Implementation Progress

- สร้าง local migration และปรับ version ให้ตรงกับ migration history: `supabase/migrations/20260907140056_customer_identities.sql`
- เพิ่ม Foreign Key ไป `customers(id)` โดยใช้ชนิด `integer` ตรงกับ schema ปัจจุบัน
- เพิ่ม identity uniqueness: `(provider, provider_account_id, provider_user_id)`
- เพิ่ม lifecycle constraints สำหรับ `pending`, `verified` และ `revoked`
- เพิ่ม indexes สำหรับ `customer_id`, `status` และ pending verification queue
- เปิด RLS โดยไม่มี client policy และ revoke สิทธิ์ `public`, `anon`, `authenticated` เพื่อ deny-by-default
- ให้สิทธิ์เฉพาะ `service_role` สำหรับ server-side integration
- ใช้ trigger `public.set_updated_at()` ที่ตรวจพบแล้วใน project
- Apply ไปยัง Supabase project `puslxgriozubqlpoxrqo` สำเร็จ
- migration history บันทึก version `20260907140056` ชื่อ `customer_identities`
- ตรวจพบตารางจริงและมีจำนวนข้อมูลเริ่มต้น 0 แถว
- ตรวจครบ 9 constraints, 5 indexes และ trigger `customer_identities_set_updated_at`
- ยืนยัน RLS เปิดอยู่และไม่มี client policy ตาม deny-by-default design
- ยืนยัน `anon` และ `authenticated` ไม่มีสิทธิ์ SELECT/INSERT
- ยืนยัน `service_role` มีสิทธิ์ SELECT/INSERT/UPDATE/DELETE
- เพิ่ม corrective migration `supabase/migrations/20260907141822_restrict_customer_identities_service_role_privileges.sql`
- ยืนยัน `service_role` ไม่มีสิทธิ์ TRUNCATE/REFERENCES บน `customer_identities`
- Supabase security advisor แสดง INFO `rls_enabled_no_policy` ซึ่งเป็นผลที่คาดไว้สำหรับ server-only table นี้
- Supabase performance advisor แสดง unused indexes สำหรับตารางใหม่ ซึ่งเป็นผลปกติก่อนเริ่มมี traffic
- `git diff --check` ผ่าน
- local database lint ยังรันไม่ได้เพราะเครื่องไม่มี Docker หรือ Podman แต่ได้ตรวจ schema จริงบน remote แล้ว

### Batch 1B Implementation Progress

- สร้างและ Apply migration `supabase/migrations/20260907141417_customer_addresses.sql`
- เพิ่ม Foreign Key `customer_id` ไป `customers(id)` พร้อม `ON DELETE CASCADE`
- เพิ่มการตรวจช่องว่างสำหรับชื่อผู้รับ, เบอร์โทร, ที่อยู่, จังหวัด และรหัสไปรษณีย์เมื่อมีค่า
- เพิ่ม `is_default BOOLEAN NOT NULL DEFAULT false`
- เพิ่ม unique partial index เพื่อให้ลูกค้าหนึ่งคนมีที่อยู่หลักได้ไม่เกินหนึ่งรายการ
- เพิ่ม index ของ `customer_id` และ trigger `customer_addresses_set_updated_at`
- เปิด RLS โดยไม่มี client policy และ revoke สิทธิ์ `public`, `anon`, `authenticated`
- สร้าง corrective migration `supabase/migrations/20260907141556_restrict_customer_addresses_service_role_privileges.sql`
- corrective migration revoke auto-grant เดิมก่อน grant เฉพาะ SELECT/INSERT/UPDATE/DELETE ให้ `service_role`
- ยืนยัน `service_role` ไม่มีสิทธิ์ TRUNCATE/REFERENCES บน `customer_addresses`
- migration history มี `customer_addresses` version `20260907141417` และ corrective version `20260907141556`
- ตรวจพบตารางจริงจำนวน 0 แถว, 7 constraints, 3 indexes และ 1 trigger
- Supabase security advisor แสดง INFO `rls_enabled_no_policy` ซึ่งเป็นผลที่คาดไว้สำหรับ server-only table นี้
- Supabase performance advisor แสดง unused index สำหรับตารางใหม่ ซึ่งเป็นผลปกติก่อนเริ่มมี traffic

### Batch 1C Implementation Progress

- สร้างและ Apply migration `supabase/migrations/20260907143413_customer_api_functions.sql`
- เพิ่ม `register_customer_with_address` เป็น `SECURITY INVOKER` transaction สำหรับสร้าง customer, default address และ consent พร้อมกัน
- เพิ่ม `save_customer_address` สำหรับเพิ่ม/แก้ไข/สลับที่อยู่หลักแบบ atomic
- เพิ่ม `delete_customer_address` ซึ่งเลื่อนที่อยู่ล่าสุดเป็น default เมื่อมีการลบที่อยู่หลัก
- revoke EXECUTE จาก `public`, `anon`, `authenticated` และ grant เฉพาะ `service_role`
- ลดสิทธิ์ `service_role` บน `customers` และ `consent_logs` เหลือ SELECT/INSERT/UPDATE/DELETE
- ปิด public consent write/read endpoint เดิมด้วย HTTP 410; consent ถูกบันทึกใน registration transaction เท่านั้น
- Public API: `POST /api/customers/register`
- Admin APIs: `GET /api/admin/customers`, `GET /api/admin/customers/:customerId`
- Admin Address APIs: `GET/POST /api/admin/customers/:customerId/addresses`
- Admin Address APIs: `PATCH/DELETE /api/admin/customers/:customerId/addresses/:addressId`
- เพิ่ม server-side validation, phone normalization, input length limits และ response `Cache-Control: no-store`
- ทุก admin route ตรวจ session ซ้ำภายใน route นอกเหนือจาก middleware
- หน้า `/admin/customers` ค้นหาผ่าน server พร้อม pagination metadata
- เพิ่มหน้า `/admin/customers/:customerId` สำหรับเพิ่ม แก้ไข ลบ และตั้งที่อยู่หลัก
- Database transaction test ผ่านภายใต้ role `service_role` และ rollback สำเร็จ ไม่มีข้อมูลทดสอบตกค้าง
- HTTP verification: unauthenticated admin 401, login 200, authenticated search 200, invalid input 400, retired consent endpoint 410
- Browser verification: admin route redirect ไป login และหน้า registration แสดง consent gate ถูกต้อง
- `npm run build` ผ่าน รวม dynamic API routes และหน้า customer detail
- Supabase advisors ไม่มี warning/error ใหม่; INFO RLS no-policy เป็น deny-by-default ตาม design

### Batch 1D Implementation Progress

- สร้างและ Apply migration `supabase/migrations/20260907151155_customer_identity_linking.sql`
- เพิ่ม `customer_identity_link_tokens` สำหรับเก็บ HMAC digest ของรหัส 6 หลักเท่านั้น โดยไม่เก็บ plaintext
- Token ผูกกับ `customer_id`, `provider`, `provider_account_id` และ `provider_user_id`
- Token อายุไม่เกิน 10 นาที ใช้ได้ครั้งเดียว และมี unique partial index บังคับ active token เพียงรายการเดียวต่อ provider identity
- การสร้าง token ใหม่ supersede token เก่าแบบ atomic พร้อม audit event
- เพิ่ม failed-attempt counter แบบ atomic; ผิดครบ 5 ครั้งล็อก 15 นาที
- เพิ่ม `customer_identity_verification_audit_logs` แบบ append-only สำหรับ service role โดยไม่บันทึก plaintext code, ที่อยู่ หรือเนื้อหา LINE message
- เพิ่ม RPC แบบ `SECURITY INVOKER`: `create_customer_identity_link_token`, `record_customer_identity_link_failure`, `consume_customer_identity_link_token`
- revoke EXECUTE จาก `public`, `anon`, `authenticated` และ grant เฉพาะ `service_role`
- เปิด RLS แบบไม่มี client policy บน token และ audit tables; service role มีเฉพาะสิทธิ์ที่จำเป็น
- เพิ่ม HMAC-SHA256 ด้วย server-only `CUSTOMER_LINK_TOKEN_SECRET` และใช้ constant-time comparison ใน server application
- เพิ่ม `POST /api/admin/customers/:customerId/line-link` ซึ่งตรวจ admin session และคืน plaintext code เพียง response แรกครั้งเดียว
- หน้า customer detail เพิ่มแผงสร้างรหัส, คำเตือนให้โทรไปยังเบอร์เดิม, masked identity และ audit events ล่าสุด
- LINE webhook ตรวจ signature จาก raw body ก่อนเสมอ และใช้ `destination` เป็น OA namespace ก่อนตรวจรหัส 6 หลัก
- LINE webhook ไม่เก็บข้อความแชทและตอบ verification failure ด้วยข้อความกลางเพื่อป้องกัน account enumeration
- รองรับการเปลี่ยน LINE OA เพราะ identity uniqueness รวม `provider_account_id`; identity ของ OA เดิมยังคงอยู่และ OA ใหม่สามารถเชื่อมเพิ่มได้
- เพิ่ม `LINE_BOT_USER_ID` เป็น optional environment; หากไม่กำหนด ระบบ resolve bot user ID จาก LINE Bot Info API
- ต้องตั้ง `CUSTOMER_LINK_TOKEN_SECRET` ความยาวอย่างน้อย 32 ตัวอักษรใน production environment ก่อนเปิดใช้งานจริง
- Database transaction verification ผ่าน: supersession, 5-attempt lock, atomic consume, replay prevention, cross-customer identity conflict และ audit creation
- การทดสอบฐานข้อมูลใช้ transaction + rollback และยืนยันข้อมูลทดสอบเหลือ 0 แถว
- HTTP verification ผ่าน: unauthenticated 401, login 200, invalid LINE user ID 400, missing customer 404 และ invalid webhook signature 401
- Browser verification ผ่าน: admin login, customer list, identity-link panel, empty states และ inline validation error; ไม่มี unexpected console errors
- `npm run build` ผ่าน รวม route `/api/admin/customers/[customerId]/line-link` และหน้า customer detail
- Supabase advisors ไม่มี warning/error ใหม่; INFO RLS no-policy เป็น deny-by-default ตาม design และ unused indexes เป็นปกติก่อนมี traffic

### Batch 3A Implementation Progress

- reconnect Supabase connector สำเร็จ และยืนยันโปรเจกต์ `puslxgriozubqlpoxrqo` มีสถานะ `ACTIVE_HEALTHY`
- สร้างและ Apply migration `supabase/migrations/20260907155209_order_intake.sql`
- สร้างและ Apply corrective migration `supabase/migrations/20260907155451_add_orders_source_address_index.sql`
- เพิ่มตาราง `orders` และ `order_items` พร้อม RLS deny-by-default, constraints และ indexes
- เพิ่ม `create_draft_order` transaction สำหรับสร้าง Draft + item snapshots แบบ atomic
- ใช้ idempotency key พร้อม transaction advisory lock ป้องกันทั้ง retry และ concurrent request แล้วสร้างออเดอร์ซ้ำ
- รับจาก browser เฉพาะ customer, address, verified identity, product flavor ID และ quantity; ชื่อสินค้า รสชาติ แบรนด์ SKU variant key และราคาดึงจากฐานข้อมูล
- Draft ไม่จองและไม่ตัดสต็อกตาม Design Lock
- เพิ่ม Admin APIs สำหรับ list/create order และ order detail พร้อมตรวจ admin session ภายใน route
- เพิ่มหน้า `/admin/orders`, `/admin/orders/new` และ `/admin/orders/[orderId]`
- `npm run build` ผ่านครบทุก route/page
- ยืนยันตารางทั้งสองเปิด RLS, เริ่มต้น 0 แถว และไม่มีสิทธิ์สำหรับ `public`, `anon`, `authenticated`
- ยืนยัน `create_draft_order` เป็น `SECURITY INVOKER`, ใช้ empty `search_path` และ EXECUTE ได้เฉพาะ `service_role`
- remote transaction verification ผ่าน: สร้าง Draft, item snapshot, idempotent replay และยืนยันว่า stock ไม่เปลี่ยน
- การทดสอบใช้ transaction + rollback และยืนยันว่า order, item และ customer ทดสอบเหลือ 0 แถว
- Supabase performance advisor ไม่เหลือ unindexed foreign key หลัง corrective migration
- Security advisor แสดงเฉพาะ INFO `rls_enabled_no_policy` สำหรับตาราง server-only ซึ่งตรงกับ deny-by-default design

### Batch 3B Implementation Progress

- กำหนด lifecycle ของ Batch 3B เป็น `draft → pending` พร้อม stock reservation แบบ atomic โดยยังไม่ลด `product_flavors.stock_quantity`
- สร้างและ Apply migration `supabase/migrations/20260907160625_atomic_order_reservations.sql`
- สร้างและ Apply corrective migration `supabase/migrations/20260907161107_add_stock_reservation_order_item_index.sql`
- เพิ่ม `stock_reservations` พร้อม Foreign Keys, quantity/status constraints, expiration, duplicate prevention และ required indexes
- เปิด RLS แบบ deny-by-default; ไม่มีสิทธิ์สำหรับ `public`, `anon`, `authenticated` และให้ `service_role` เฉพาะ SELECT/INSERT/UPDATE/DELETE
- เพิ่ม `reserve_draft_order` เป็น `SECURITY INVOKER` transaction พร้อม empty `search_path` และ EXECUTE เฉพาะ `service_role`
- ใช้ row lock กับ Order และ `product_flavors` ตามลำดับ UUID ก่อนคำนวณ available stock เพื่อกัน concurrent overselling
- availability คำนวณจาก physical stock ลบ active reservations ที่ยังไม่หมดอายุ
- รองรับ idempotent replay เมื่อออเดอร์อยู่ `pending` และ reservation ยังครบ/ไม่หมดอายุ
- เพิ่ม `POST /api/admin/orders/:orderId/reserve` พร้อม admin session check และ SQLSTATE error mapping
- หน้า Order Detail เพิ่มปุ่ม “ตรวจและจองสต็อก”, loading/error/success state และเวลา reservation หมดอายุ
- Database transaction verification ผ่าน: reserve สำเร็จ, retry ไม่สร้างซ้ำ, ออเดอร์คู่แข่ง SKU เดียวกันถูกปฏิเสธ และ physical stock ไม่เปลี่ยน
- การทดสอบฐานข้อมูลใช้ transaction + rollback และยืนยัน order, item, reservation และ customer ทดสอบเหลือ 0 แถว
- HTTP verification ผ่าน: unauthenticated 401, login 200, invalid UUID 400 และ missing order 404
- `npm run build` ผ่าน รวม route `/api/admin/orders/[orderId]/reserve`
- Supabase advisors ไม่มี warning/error ใหม่; unindexed foreign key ถูกแก้แล้ว ส่วน INFO unused indexes เป็นปกติก่อนมี production traffic

### Batch 4 Implementation Progress

- สร้างและ Apply migration `supabase/migrations/20260907161938_confirm_orders_with_stock_ledger.sql`
- เพิ่ม `stock_ledger` เป็น append-only ledger สำหรับบันทึก physical stock movement พร้อม previous/new balance constraints
- Sale ledger บังคับอ้างอิง `order_id`, `order_item_id` และ `reservation_id`; unique reservation reference ป้องกันการตัดซ้ำ
- เปิด RLS แบบ deny-by-default; ไม่มีสิทธิ์สำหรับ `public`, `anon`, `authenticated` และให้ `service_role` เฉพาะ SELECT/INSERT
- เพิ่ม `confirm_pending_order` เป็น `SECURITY INVOKER` transaction พร้อม empty `search_path` และ EXECUTE เฉพาะ `service_role`
- Confirmation ทำ `pending → confirmed`, ลด `product_flavors.stock_quantity`, เปลี่ยน reservation เป็น `confirmed` และเขียน sale ledger ใน transaction เดียว
- ล็อก Order และ variant rows ตามลำดับ UUID ก่อนตัดสต็อกเพื่อกัน concurrent confirmation/stock mutation
- รองรับ idempotent replay: กดยืนยันออเดอร์ที่ confirmed แล้วจะไม่ลดสต็อกหรือสร้าง ledger ซ้ำ
- หาก reservation หมดอายุ ระบบล้าง hold เก่าและคืนออเดอร์เป็น Draft โดยไม่ตัดสต็อก เพื่อให้แอดมินจองใหม่ได้
- เพิ่ม `POST /api/admin/orders/:orderId/confirm` พร้อม admin session check และ SQLSTATE error mapping
- หน้า Order Detail เพิ่มปุ่ม “ยืนยันและตัดสต็อก”, loading/error/success state และสถานะ confirmed
- Database transaction verification ผ่าน: reserve → confirm, stock deduction, balanced ledger, retry safety และ expired-reservation recovery
- การทดสอบฐานข้อมูลใช้ transaction + rollback และยืนยัน order, item, reservation, ledger และ customer ทดสอบเหลือ 0 แถว
- HTTP verification ผ่าน: unauthenticated 401, login 200, invalid UUID 400 และ missing order 404
- `npm run build` ผ่าน รวม route `/api/admin/orders/[orderId]/confirm`
- Supabase advisors ไม่มี warning/error ใหม่; INFO RLS no-policy เป็น deny-by-default และ unused indexes เป็นปกติก่อนมี production traffic

### Batch 5 Implementation Progress

- เชื่อมข้อความที่คัดลอกจาก Browser Cart เข้าสู่ LINE webhook order intake โดยไม่เพิ่มตารางเก็บแชท
- เพิ่ม strict parser สำหรับหัวข้อ `รายการขอเช็กสินค้า Pod4U` และคู่ข้อมูล `[SKU/variant_key] + จำนวน`
- Parser จำกัดขนาดข้อความ, จำนวนรายการ, quantity และรวม identifier ซ้ำอย่างปลอดภัย
- ไม่เชื่อชื่อสินค้า ราคา หรือยอดรวมจากข้อความ; resolve เฉพาะ SKU, variant key หรือ product flavor UUID กับฐานข้อมูลใหม่
- รับ Order Intake เฉพาะ direct chat ของ LINE user ที่มี verified identity ใน OA namespace ปัจจุบัน
- บังคับให้สมาชิกมี default shipping address ก่อนสร้าง Draft
- ใช้ `webhookEventId` ร่วมกับ OA destination เป็น idempotency key เพื่อให้ LINE redelivery ไม่สร้างออเดอร์ซ้ำ
- Draft ที่สร้างจาก LINE บันทึก `order_source = line`, verified identity และ shipping snapshot แต่ไม่เก็บเนื้อหาข้อความใน `admin_note`
- รองรับทั้งข้อความรายการจากเว็บและ quick-reply postback เดิม โดยผลลัพธ์เป็น Draft เท่านั้น ยังไม่จอง/ตัดสต็อก
- ตรวจ HMAC-SHA256 signature จาก raw body ก่อน parse JSON และจำกัด webhook payload/events
- ไม่ตอบข้อความเมื่อ webhook event อยู่ `standby` mode และกำหนดให้รหัสยืนยันสมาชิกส่งใน direct chat เท่านั้น
- เพิ่มข้อความตอบกลับแยกกรณียังไม่เชื่อมสมาชิก, ไม่มีที่อยู่หลัก, SKU ระบุไม่ได้ และรูปแบบรายการไม่ถูกต้อง
- ปรับข้อความแนะนำใน LINE ให้ชัดว่าต้องเลือกสินค้าบนเว็บและส่งรายการมาที่ OA พร้อมแก้ URL เป็น `https://pod4u.store/stock`
- Parser verification ผ่าน: valid cart, non-order detection และ invalid quantity rejection
- Database transaction verification ผ่าน: verified LINE identity + default address สร้าง Draft ได้ และ event เดิม replay แล้วไม่สร้างซ้ำ
- การทดสอบฐานข้อมูลใช้ transaction + rollback และยืนยัน order, item และ identity ทดสอบเหลือ 0 แถว
- Signed webhook verification ผ่าน: empty events 200, standby event 200 โดยไม่ประมวลผล และ invalid signature 401
- `npm run build` และ `git diff --check` ผ่าน

### Batch 6 Implementation Progress

- เปลี่ยน admin session จาก token คงที่เป็น signed HMAC session ที่มี `accountId`, `role`, เวลาออก token และเวลาหมดอายุ 24 ชั่วโมง
- รหัส `ADMIN_PASSWORD` เดิมยังเข้าได้ในฐานะ `owner` เพื่อให้ระบบเดิมใช้งานต่อเนื่อง; เปลี่ยน `ADMIN_SESSION_SECRET` เพื่อบังคับ logout ทุกบัญชีได้
- เพิ่ม optional `ADMIN_ACCOUNTS_JSON` สำหรับบัญชีทีมงานรายบุคคลโดยเก็บ configuration ฝั่ง server เท่านั้น
- เพิ่ม 5 roles: `owner`, `manager`, `order_staff`, `support`, `stock_staff`
- เพิ่ม permission matrix สำหรับ dashboard, order create/view/reserve/confirm/cancel/ship, customer view/manage/link, stock view/manage และ settings view
- บังคับ permission ซ้ำภายใน Admin API ทุก route; unauthenticated ได้ 401 และบัญชีที่ไม่มีสิทธิ์ได้ 403
- Middleware ป้องกันการเปิดหน้า admin ที่ role ไม่มีสิทธิ์ และ sidebar แสดงเฉพาะเมนูที่บัญชีนั้นเข้าถึงได้
- หน้า login ไม่แสดง sidebar ก่อนยืนยันตัวตนแล้ว
- Dashboard โหลดเฉพาะชุดข้อมูลที่ role มีสิทธิ์ จึงไม่เปิด customer PII ให้ stock-only role และไม่ทำให้หน้า error เมื่อไม่มีสิทธิ์บางโมดูล
- สร้างและ Apply migration `supabase/migrations/20260907170547_admin_order_operations.sql`
- เพิ่ม shipment/cancellation audit fields ใน `orders`: carrier, tracking number, shipped/delivered/cancelled timestamps และ actor
- เพิ่ม `cancel_order` แบบ atomic สำหรับ draft, pending และ confirmed; pending จะ release reservation และ confirmed จะคืน physical stock พร้อมเขียน `return` ledger
- เพิ่ม unique partial index ป้องกันการคืนสต็อกซ้ำต่อ order item และรองรับ idempotent replay เมื่อกดยกเลิกซ้ำ
- ไม่อนุญาตยกเลิก order ที่ shipped หรือ delivered เพื่อลดความผิดพลาดทางปฏิบัติการ
- เพิ่ม `mark_order_shipped` และ `mark_order_delivered` แบบ atomic พร้อมตรวจลำดับสถานะและ idempotent replay
- เพิ่ม `PATCH /api/admin/orders/:orderId/status` สำหรับ cancel, ship และ deliver พร้อม validation, permission check และ SQLSTATE mapping
- หน้า Order Detail เพิ่มปุ่มยกเลิก, ฟอร์มบริษัทขนส่ง/เลขพัสดุ และปุ่มยืนยันส่งถึงลูกค้า โดยซ่อนตาม permission
- Database transaction verification ผ่านและ rollback สำเร็จ: confirmed cancellation คืน stock + ledger, cancel replay ไม่คืนซ้ำ, pending cancellation ปล่อย hold และ confirmed → shipped → delivered
- Browser verification ด้วยบัญชี `support` ผ่าน: login สำเร็จ, sidebar เหลือเฉพาะ Dashboard/Orders/Customers, เปิด `/admin/stock` ถูก redirect และเรียก stock API ตรงได้ 403
- `npx tsc --noEmit` และ `npm run build` ผ่าน รวม route `/api/admin/orders/[orderId]/status`
- Supabase migration history ยืนยัน version `20260907170547` ชื่อ `admin_order_operations`
- Supabase advisors ไม่มี warning/error ใหม่; security INFO RLS no-policy ยังคงเป็น deny-by-default สำหรับ server-only tables และ performance INFO unused indexes เป็นปกติก่อนมี production traffic

### Batch 7 Implementation Progress

- สร้างและ Apply migration `supabase/migrations/20260907173029_nightly_stock_import_staging.sql`
- เพิ่ม `stock_import_batches` และ `stock_import_rows` สำหรับเก็บไฟล์นำเข้าเป็น staging ของระบบเองก่อนเปลี่ยน physical stock
- เปิด RLS แบบ deny-by-default และให้ `service_role` ทำงานฝั่ง server เท่านั้น; browser และสมาชิกทั่วไปอ่านข้อมูลนำเข้าไม่ได้
- เพิ่ม `stage_stock_import` สำหรับตรวจไฟล์สูงสุด 5,000 แถว โดยตรวจ SKU ว่าง, จำนวนไม่ถูกต้อง, SKU ซ้ำ และ SKU ที่หาใน catalog ไม่พบ
- ใช้ checksum ร่วมกับ source ป้องกันการสร้าง batch ซ้ำเมื่ออ่านไฟล์เดิมอีกครั้ง
- เพิ่ม `apply_stock_import` แบบ atomic: lock variant, ตรวจ stale preview, เปลี่ยน `product_flavors.stock_quantity` และเขียน `stock_import` ledger ต่อ SKU ใน transaction เดียว
- การ apply ซ้ำไม่ตัดสต็อกซ้ำ และระบบปฏิเสธ batch ที่มีแถวผิดหรือยอดสต็อกเปลี่ยนหลัง preview
- เพิ่ม Google Sheets reader แบบ read-only โดยใช้ service account ฝั่ง server; private key และ access token ไม่ถูกส่งไป browser หรือบันทึกลงฐานข้อมูล
- Parser รองรับหัวคอลัมน์จริงของชีทกลาง `sku` และ `current_stock` รวมถึงชื่อคอลัมน์มาตรฐาน/ภาษาไทยที่กำหนดไว้
- พบไฟล์กลาง `Inventory & Accounting Master - Supabase` (`1K4TCznk7rhYZZnNW2TJtUqdUUlov2NHv_Ad9OSsTMnE`) และยืนยัน tab `01_PRODUCTS` มี schema สำหรับสินค้าและสต็อก
- การอ่านแบบจำกัดช่วงพบเฉพาะ header ใน `01_PRODUCTS`, `04_STOCK_LEDGER` และ `11_STOCK_CHECK`; ยังไม่มีแถวข้อมูลจริง จึงยังไม่สามารถ reconciliation กับไฟล์รอบจัดส่งจริงได้
- เพิ่ม `GET/POST /api/admin/stock-imports` และ `POST /api/admin/stock-imports/:batchId/apply` พร้อม permission `stock.manage`
- เพิ่มหน้า `/admin/stock/imports` สำหรับอ่านชีท, ดูประวัติ batch, preview เดิม/ใหม่/delta/error และกดยืนยันก่อนอัปเดต
- เพิ่ม cron endpoint `/api/cron/stock-import` พร้อม Bearer `CRON_SECRET` และ constant-time comparison
- ตั้ง Vercel Cron เวลา `20:00 UTC` หรือ `03:00 Asia/Bangkok` ของวันถัดไป เพื่อให้ไฟล์หลังรอบจัดส่งมีเวลาอัปเดตก่อนระบบอ่าน; โหมด default คือ stage/preview เท่านั้น
- `STOCK_IMPORT_AUTO_APPLY=false` เป็นค่าเริ่มต้น; แม้เปิดภายหลัง ระบบยังบังคับ zero invalid rows และเพดาน `STOCK_IMPORT_MAX_CHANGED_ROWS`
- หน้า Settings แสดงสถานะ Google Sheet/Cron และสถานะ auto-apply โดยไม่เปิดเผย secret
- Database verification ผ่านทั้ง valid stage/apply/ledger/idempotency และ validation-failed cases; ทุกชุดทดสอบใช้ transaction + rollback
- Browser verification ผ่าน: stock staff เห็นหน้า import, support ถูก redirect และ API ตอบ 403, missing Google config แสดงข้อความที่เข้าใจได้ และ cron ที่ไม่มี secret ตอบ 401
- Supabase migration history ยืนยัน version `20260907173029` ชื่อ `nightly_stock_import_staging`
- Supabase advisors ไม่มี warning/error ใหม่; INFO RLS no-policy เป็น deny-by-default ตาม design และ unused indexes เป็นปกติก่อนมี production traffic
- ยังไม่มีการแก้ไข Google Sheet, deploy production หรือเปลี่ยนสต็อกจริง

#### Batch 7 Production Activation Checklist

1. เปิด Google Sheets API ใน Google Cloud project และสร้าง service account สำหรับอ่านสต็อก
2. แชร์ไฟล์กลางให้ `GOOGLE_SERVICE_ACCOUNT_EMAIL` เป็น Viewer เท่านั้น
3. ตั้งค่า Vercel server environment: `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `GOOGLE_STOCK_SPREADSHEET_ID`, `GOOGLE_STOCK_SHEET_RANGE`, `CRON_SECRET`
4. ใช้ `GOOGLE_STOCK_SPREADSHEET_ID=1K4TCznk7rhYZZnNW2TJtUqdUUlov2NHv_Ad9OSsTMnE` และ `GOOGLE_STOCK_SHEET_RANGE=01_PRODUCTS!A:T`
5. คง `STOCK_IMPORT_AUTO_APPLY=false` แล้วนำไฟล์จริงรอบแรกเข้า preview เพื่อเทียบ SKU, จำนวนแถว, ยอดเดิม/ใหม่ และรายการผิด
6. ให้ผู้ดูแลสต็อกกดยืนยัน batch แรกด้วยตนเองและตรวจ `stock_ledger` หลัง apply
7. เปิด auto-apply เฉพาะหลังผ่าน reconciliation หลายรอบและกำหนด `STOCK_IMPORT_MAX_CHANGED_ROWS` ที่เหมาะกับงานจริง

### Batch 7A Cron Monitoring Implementation Progress

- สร้าง local migration `supabase/migrations/20260908134004_stock_import_runs.sql`
- เพิ่มตาราง `stock_import_runs` สำหรับบันทึก cron execution log โดยไม่เก็บ spreadsheet contents, credentials, access tokens, stack traces หรือ customer data
- ฟิลด์หลัก: `id`, `trigger_type` (cron/manual), `status`, `batch_id`, `started_at`, `finished_at`, `rows_read`, `valid_count`, `invalid_count`, `changed_count`, `auto_apply_enabled`, `applied`, `error_code`, `safe_message`
- Status values: `running`, `success`, `review_required`, `failed`, `skipped`
- CHECK constraints: trigger_type, status, finished_lifecycle, counts, error_lifecycle, error_code length ≤100, safe_message length ≤500
- Indexes: `started_at` DESC, `status`, `batch_id` (partial)
- เปิด RLS แบบ deny-by-default; revoke สิทธิ์จาก `public`, `anon`, `authenticated` และ `service_role` แล้ว grant เฉพาะ SELECT/INSERT/UPDATE ให้ `service_role`
- ไม่ใช้ `SECURITY DEFINER`
- เพิ่ม `stock-import-runs-service.ts` พร้อม `createStockImportRun`, `finalizeStockImportRun`, `getStockImportRuns`, `getLatestStockImportRun`, `getLatestSuccessfulStockImportRun`, `getLatestFailedStockImportRun` และ `sanitizeErrorCode`
- อัปเดต `/api/cron/stock-import` ให้สร้าง `running` record หลัง auth check, finalize ด้วย status ที่เหมาะสม (success/review_required/failed/skipped), บันทึก batch_id, rows/valid/invalid/changed counts และ sanitized error
- Cron integration บันทึก sanitized error code เท่านั้น; ไม่เปิดเผย raw exception message ที่อาจมี credentials
- ความล้มเหลวในการอัปเดต monitoring record ไม่ทำให้ stock ถูก apply ซ้ำ (run record update ทำหลัง staging/apply logic)
- เพิ่ม `/api/admin/stock-imports/monitoring` endpoint ที่คืน latestRun, lastSuccessfulRun, lastFailedRun, recentRuns (max 20), schedule, nextScheduledRun, autoApplyEnabled, integrationConfigured
- API protected ด้วย `stock.manage` permission; ไม่คืน env var values หรือ secrets
- integrationConfigured ตรวจเฉพาะการมีของ `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `GOOGLE_STOCK_SPREADSHEET_ID`
- อัปเดตหน้า `/admin/stock/imports` ด้วย monitoring section ด้านบน
- UI แสดง: schedule (ทุกวัน 03:00 น.), latest execution date/time, latest status, last successful execution, next expected execution, rows read, changed rows, invalid rows, auto apply status, integration config status
- Status colors: green (success), amber (review_required/skipped), red (failed), blue (running), gray (never run)
- Warning conditions: ไม่เคยมี successful run, latest run failed, run ที่ `running` เกิน 15 นาที, ไม่มี successful run หลัง 03:30 ของวันปัจจุบัน, integration config ไม่ครบ
- Access control: owner, manager, stock_staff ผ่าน permission `stock.manage`; support, order_staff ไม่สามารถเข้าถึงหน้าหรือ API ได้
- TypeScript type check (`npx tsc --noEmit`) ผ่าน
- Production build (`npm run build`) ผ่าน
- `git diff --check` ผ่าน
- Browser verification ไม่ได้ดำเนินการเนื่องจาก browser tooling ไม่พร้อมใช้งาน
- Known limitation: Google Sheets Values API ไม่ให้ source file update timestamp ที่เชื่อถือได้; UI แสดง "หมายเหตุ: ระบบไม่สามารถตรวจสอบความใหม่ของไฟล์ต้นทางได้" และจะต้องมี supplier ส่งค่า `stock_as_of` ที่ยืนยันได้ในอนาคต
- **Migration นี้ยังไม่ถูก apply ไปยัง remote Supabase project** — รอ Codex audit และ apply
- **Production ยังไม่ถูก deploy**

### Files Changed

- `supabase/migrations/20260908134004_stock_import_runs.sql` — new migration
- `src/lib/stock-import-runs-service.ts` — new service
- `src/app/api/cron/stock-import/route.ts` — updated
- `src/app/api/admin/stock-imports/monitoring/route.ts` — new API endpoint
- `src/app/admin/stock/imports/page.tsx` — updated with monitoring section
- `docs/order-system-audit-report.md` — updated with Batch 7A progress

#### Batch 7A Repair

Following Codex audit, the following repairs were applied:

**1. Migration lifecycle constraint:**
- Fixed `stock_import_runs_error_lifecycle_check` to accept `skipped` status with `safe_message`
- Added `stock_import_runs_applied_consistency_check` requiring `applied = true` only when `status = success` and `batch_id is not null`
- Constraint logic: `running` (error_code NULL, safe_message NULL), `success` (error_code NULL, safe_message optional), `skipped` (error_code NULL, safe_message optional), `review_required` (error_code NOT NULL, safe_message optional), `failed` (error_code NOT NULL, safe_message optional)

**2. Manual-review reasons separated correctly:**
- `VALIDATION_ERROR` when `invalid_count > 0`
- `CHANGE_LIMIT_EXCEEDED` when `changed_count > maxChangedRows`
- `AUTO_APPLY_DISABLED` when auto-apply is disabled and staging succeeds
- `skipped` with no error_code when same checksum already processed
- `success` with `applied = true` when auto-apply succeeds

**3. Bangkok timezone calculations:**
- Created `src/lib/bangkok-time.ts` with pure functions independent of host timezone
- `getNextScheduledRun()` uses `Date.UTC()` to avoid host timezone dependency
- Schedule always 03:00 Bangkok (20:00 UTC previous day)
- `shouldShowNoSuccessAfter0330Warning()` correctly checks current Bangkok date components

**4. Supabase query failure handling:**
- Service methods now throw errors instead of returning `[]` or `null`
- Uses `.maybeSingle()` for queries where zero rows are legitimate
- Monitoring API catches errors and returns generic HTTP 500
- Admin UI surfaces monitoring API failure with Thai error message

**5. integrationConfigured:**
- Now requires `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `GOOGLE_STOCK_SPREADSHEET_ID`, and `CRON_SECRET`
- Does not expose values

**6. Bangkok time display:**
- All monitoring timestamps formatted with `timeZone: "Asia/Bangkok"`
- Independent of administrator's browser timezone

**7. Security behavior preserved:**
- Cron authentication checked before creating run record
- Monitoring API requires `stock.manage` permission
- `public`, `anon`, `authenticated` have no access to `stock_import_runs`
- `service_role` has only SELECT, INSERT, UPDATE
- No credentials, spreadsheet contents, customer data, or raw exception bodies stored
- Monitoring failures cannot cause stock to be applied twice
- `STOCK_IMPORT_AUTO_APPLY` remains `false` by default
- Schedule remains `0 20 * * *` (03:00 Asia/Bangkok)

**Tests performed:**
- `npx tsc --noEmit` — **Passed**
- `npm run build` — **Passed**
- `git diff --check` — **Passed**
- Bangkok time helper tests (8 test cases) — **All Passed**
  - Bangkok 02:59 → next run same day 03:00: PASS
  - Bangkok 03:00 → next run next day 03:00: PASS
  - Bangkok 18:00 → next run following day 03:00: PASS
  - Month-end transition: PASS
  - Year-end transition: PASS
  - Warning before 03:30: PASS
  - No warning when success today: PASS
  - Warning when success yesterday: PASS

**Browser verification:**
- Not performed — migration not applied remotely, testing against empty/non-existent table not meaningful

**Previous claims corrected:**
- Previous statement "skipped + safe_message rejected" was correct; now fixed in migration
- Previous warning logic required success after 03:30; now correctly requires success on current Bangkok day
- Previous `integrationConfigured` omitted `CRON_SECRET`; now included
- **Wrong:** "Bangkok 18:00 → next run same day 03:00"
- **Correct:** "Bangkok 18:00 → next run following day 03:00" (03:00 already passed on the same Bangkok calendar day)

**8. Monitoring failure must not change stock-import behavior:**
- Fixed business logic branches to not gate on `runId`
- Stock workflow now proceeds correctly regardless of whether monitoring record was created
- Monitoring updates happen only when `runId` is available
- Structure changed from `if (condition && runId) { finalize; return; }` to `if (condition) { if (runId) { finalize; } return; }`
- This ensures idempotent ready batches are always skipped, validation failures always return review, auto-apply conditions work correctly, etc.

**Tests performed:**
- `npx tsc --noEmit` — **Passed**
- `npm run build` — **Passed**
- `git diff --check` — **Passed**

**Status:** ✅ Applied and Verified — Production Deployment Pending

**Migration applied remotely:** ✅ Version `20260908134004` (`stock_import_runs`)
**Production not deployed:** ✅ Confirmed
**Real stock not changed:** ✅ Confirmed

##### Batch 7A Timezone Final Repair

- แก้ helper เวลาไทยให้คำนวณจาก absolute timestamp + UTC+7 โดยไม่ใช้ `getTimezoneOffset()`
- `getNextScheduledRun(now)` รองรับ deterministic test และคงรอบ `03:00 Asia/Bangkok` (`20:00 UTC` ของวันก่อนหน้า)
- รวม logic เตือนหลัง 03:30 ไว้ใน shared helper และหน้า Admin นำ helper เดียวกันไปใช้ ไม่มี timezone logic ซ้ำ
- แยก stock-import business branches ออกจาก availability ของ monitoring `runId`; monitoring ล้มเหลวไม่เปลี่ยนผล skipped, validation, limit, manual review หรือ auto-apply
- Deterministic tests ผ่านเหมือนกันภายใต้ `TZ=UTC`, `TZ=Asia/Bangkok` และ `TZ=America/New_York`
- เวลา `2026-09-08T20:31:00.000Z` ถูกอ่านเป็นกรุงเทพฯ วันที่ 9 กันยายน 2026 เวลา 03:31 ในทั้งสาม host timezones
- Next-run tests ผ่าน: 02:59 → 03:00 วันเดียวกัน, 03:00 → 03:00 วันถัดไป, 18:00 → 03:00 วันถัดไป, month-end และ year-end
- Deadline tests ผ่าน: ก่อน 03:30 ไม่เตือน, 03:31 พร้อม success เวลา 03:02 วันเดียวกันไม่เตือน และ 03:31 ที่มีเฉพาะ success วันก่อนหน้าเตือน
- `npx tsc --noEmit`, `npm run build` และ `git diff --check` ผ่าน
- ทดสอบ SQL constraints แบบ transaction + rollback ผ่าน: skipped พร้อม safe message และ success/applied ถูกยอมรับ; failed ที่ไม่มี error code, running ที่มี finished time และ applied บน non-success ถูกปฏิเสธ
- Apply migration เข้า Supabase สำเร็จ และ migration history ยืนยัน version `20260908134004`
- ยืนยัน `stock_import_runs` เปิด RLS; `service_role` มีเฉพาะ SELECT/INSERT/UPDATE และ `anon`/`authenticated` ไม่มี table grants
- Browser verification ผ่าน: `stock_staff` เปิดหน้า `/admin/stock/imports` และเห็น schedule 03:00/empty state; `support` ถูก redirect; monitoring API ตอบ 403 สำหรับ support และ 401 เมื่อไม่ login
- Supabase advisors ไม่มี warning/error ใหม่; security INFO RLS no-policy เป็น deny-by-default ตาม server-only design และ performance INFO unused indexes เป็นปกติก่อนมี traffic
- หลัง verification ตาราง `stock_import_runs`, import batches และ stock ledger ไม่มี test rows ค้างอยู่; ไม่มีการเปลี่ยนสต็อกจริง
- ยังไม่ได้ตั้ง Google service-account production environment, ยังไม่ได้แก้ Google Sheet และยังไม่ได้ deploy production

---

### Batch 8A — LINE Self-registration and Rich Menu v2

- ตั้ง Webhook URL เป็น `https://www.pod4u.store/api/line/webhook`, เปิด Use webhook และยืนยันผ่าน LINE webhook test API สำเร็จ
- Public signed empty-event verification ผ่าน HTTP 200 และ invalid signature ถูกปฏิเสธด้วย HTTP 401
- เพิ่ม Rich Menu v2 แบบ 6 ช่อง: สั่งซื้อสินค้า, สมัคร/เชื่อมสมาชิก, เช็กสถานะออเดอร์, วิธีสั่งซื้อ, ติดต่อแอดมิน และ LINE สำรอง
- สร้าง asset ขนาด 2500×843 ที่ `assets/line/rich-menu-v2.png` พร้อม source SVG และ JSON action map
- LINE Rich Menu validate API ผ่าน และ publish เป็น default Rich Menu สำเร็จ (`richmenu-f64b3188ccdc5a7e5d3f720a17a2ee72`)
- เพิ่ม postback handlers: `membership_start`, `order_status`, `order_help`, `support` และคง quick-reply order postback เดิม
- แก้ข้อความ “ต้องการสั่งซื้อสินค้า” จาก Rich Menu เดิมให้ตอบขั้นตอนสั่งซื้อแทนการค้นหาชื่อสินค้าผิดพลาด
- เพิ่ม LINE-bound registration URL แบบใช้ครั้งเดียวและหมดอายุ 10 นาที
- เก็บ opaque token ไว้ใน URL fragment เพื่อไม่ให้ token เข้า HTTP access log และเก็บใน Supabase เฉพาะ HMAC-SHA256 digest
- หน้า register ลบ fragment ออกจาก address bar ทันทีและเก็บ session ชั่วคราวใน `sessionStorage`
- สมัครสมาชิก, สร้าง default address, consent และ verified LINE identity ใน database transaction เดียว
- เพิ่ม order-status lookup จาก verified LINE identity โดยไม่ให้ลูกค้าพิมพ์ชื่อ เบอร์ หรือที่อยู่ซ้ำ
- ไม่เก็บเนื้อหาแชทใน Supabase; ติดต่อเจ้าหน้าที่ต่อผ่าน LINE OA Manager
- หน้า `/register` ไม่แสดง Welcome Popup ซ้อนกับ Consent Modal แล้ว
- Apply migration สำเร็จและปรับชื่อ local ให้ตรง migration history: `20260908142443_line_self_registration`
- Database transaction verification ผ่าน: create session → register → default address → verified identity → audit → reject replay
- Verification transaction ถูก rollback และยืนยัน test sessions, identities และ audit rows เหลือ 0 แถว
- Supabase advisors ไม่มี warning/error ใหม่; RLS no-policy เป็น INFO ตาม server-only deny-by-default และ unused indexes เป็น INFO ก่อนมี traffic
- Local signed webhook tests ผ่าน: order-help postback 200, legacy order-start 200, support postback 200 และ invalid signature 401
- Browser verification ผ่าน: token fragment ถูกลบจาก URL, LINE registration copy แสดงถูกต้อง และมี Consent Modal เพียงชั้นเดียว
- `npm run build`, LINE Rich Menu validation และ `git diff --check` ผ่าน
- Production deployment สำเร็จ: Vercel deployment `dpl_4SCoRevjYJ2zEzRbRWkLLVDiSZmi` อยู่ในสถานะ READY และ alias ไปที่ `https://www.pod4u.store`
- Production smoke test ผ่าน: `/`, `/stock`, `/register` ตอบ HTTP 200; signed empty webhook ตอบ 200; invalid signature ตอบ 401; signed order-help postback ตอบ 200
- LINE API ตรวจ default Rich Menu ได้ HTTP 200, ชื่อ `Pod4U Order Menu v2`, มี 6 action areas และ image PNG ขนาด 621,439 bytes โหลดได้ HTTP 200
- LINE webhook test API ผ่าน HTTP 200 (`success: true`, endpoint detail `200`)
- Production browser verification ผ่าน: หน้า `/register` โหลดโดยไม่มี console error, LINE token fragment ถูกลบจาก address bar, เก็บ session ชั่วคราวใน `sessionStorage` และแสดงข้อความ “กรอกข้อมูลครั้งเดียวเพื่อสมัครสมาชิกและเชื่อมกับ LINE นี้”
- Rich Menu เก่าถูกเก็บไว้ ไม่ได้ลบ เพื่อใช้ rollback หากจำเป็น
- งานที่ยังต้องทำด้วยผู้ใช้จริง: กด Rich Menu จากแอป LINE, สมัครด้วยข้อมูลทดสอบหนึ่งราย, ส่งรายการสินค้า และยืนยันว่าได้รับข้อความตอบกลับจริงก่อนปิด OA Auto-reply เดิม

#### Batch 8A Production Repair — LINE registration URL and mobile cart

- พบจาก Vercel runtime logs ว่า Rich Menu postback เข้า webhook สำเร็จ แต่ `LINE registration start` ล้มหลังสร้าง Supabase session
- ยืนยันจาก Supabase ว่าการกดจริงสร้าง `line_registration_sessions` สำเร็จ จึงตัดสาเหตุ webhook, signature, migration และ RPC ออกได้
- Root cause คือค่า `NEXT_PUBLIC_APP_URL` ของ Vercel Production ไม่สามารถ parse เป็น URL ได้ในขั้นตอนประกอบลิงก์สมัครสมาชิก
- แก้ Vercel `NEXT_PUBLIC_APP_URL` สำหรับ Production และ Preview เป็น `https://www.pod4u.store`
- เพิ่ม canonical fallback `https://www.pod4u.store` ใน `line-registration-service.ts`; ค่า env หาย, รูปแบบผิด หรือไม่ใช่ HTTPS จะไม่ทำ registration flow ล่มอีก
- ปรับหน้าสต็อกให้แสดงคำแนะนำการเลือกสินค้าและปุ่ม “ตะกร้าสินค้า” อย่างชัดเจน
- เปลี่ยนปุ่มใต้สินค้าเป็นปุ่มเต็มความกว้าง “เพิ่มลงตะกร้า” พร้อมจำนวนหลังเพิ่ม
- เพิ่มปุ่มตะกร้าลอยบนมือถือเมื่อมีสินค้า และปรับคำใน drawer จาก “รายการที่สนใจ” เป็น “ตะกร้าสินค้า”
- ซ่อน Welcome Popup บน `/stock` และ `/register` เพื่อไม่ให้บังขั้นตอนจาก Rich Menu
- ปรับ LINE order guide ให้ใช้ขั้นตอนเดียวกับ UI ใหม่: เพิ่มลงตะกร้า → ปรับจำนวน → คัดลอกรายการ → ส่งใน LINE
- Final Production deployment สำเร็จ: `dpl_2fTMXV6zuKi8TEZWUrnSadtD82AN`, alias `https://www.pod4u.store`, status READY
- Production signed membership postback test ผ่าน HTTP 200 และ runtime log เดินถึง LINE reply API โดยไม่มี `LINE registration start failed`
- Synthetic reply token ถูก LINE ปฏิเสธตามคาด; session และ audit row สังเคราะห์ถูกลบแล้ว เหลือ 0 แถว
- Production mobile browser verification ผ่าน: เห็นคำแนะนำ, เห็นปุ่มเพิ่มลงตะกร้าทุกสินค้า, เพิ่มสินค้าได้, badge เปลี่ยนเป็น 1, เปิด drawer ได้และเห็นปุ่มคัดลอกรายการ/เปิด LINE OA
- Browser console: 0 errors, 0 warnings
- `npx tsc --noEmit`, `npm run build` และ `git diff --check` ผ่าน
- Remaining acceptance: ให้ผู้ใช้กด “สมัคร/เชื่อมสมาชิก” จาก LINE จริงอีกครั้ง เพื่อยืนยันการได้รับ buttons template ด้วย reply token จริง

#### Batch 8B — Direct cart handoff to LINE

- เปลี่ยน primary cart action จากเปิด LINE เปล่าเป็น `ส่งรายการเข้า LINE`
- ใช้ LINE Official Account URL scheme `https://line.me/R/oaMessage/{LINE_ID}/?{message}` พร้อม percent-encode LINE ID และ order summary แบบ UTF-8
- ลูกค้าไม่ต้องคัดลอกหรือวางข้อความเอง; LINE เปิดแชท `@994tiktt` และกรอกรายการให้ล่วงหน้า
- ลูกค้ายังคงต้องตรวจสอบและกด “ส่ง” ใน LINE เองตามข้อจำกัดและหลักความปลอดภัยของ LINE
- คงปุ่มคัดลอกไว้เป็น fallback กรณีอุปกรณ์ไม่รองรับ LINE URL scheme
- ปรับข้อความ `วิธีสั่งซื้อ` ใน webhook ให้ตรงกับ flow ใหม่
- การเปิด LINE ยังไม่สร้าง order และไม่ตัดสต็อก; order เกิดเมื่อ webhook ได้รับข้อความที่ลูกค้ายืนยันส่งแล้วเท่านั้น
- Production deployment สำเร็จ: `dpl_DvTkW58GPQY8Z9H6pjbzybhaQ81X`, alias `https://www.pod4u.store`, status READY
- Browser verification ผ่าน: เพิ่มสินค้าจริง 1 รายการ, เปิดตะกร้า, พบ primary action “ส่งรายการเข้า LINE” และ request ไป `https://line.me/R/oaMessage/%40994tiktt/` พร้อม SKU, ชื่อสินค้า, จำนวน, ราคาและยอดรวมที่ percent-encode แล้ว; LINE ตอบ redirect ตามปกติ
- `npx tsc --noEmit`, `npm run build` และ `git diff --check` ผ่าน

### Batch 9A — Thunder payment verification gate and LINE shipment notification

- เพิ่มตาราง server-only `order_payment_requests` สำหรับผูกออเดอร์ LINE หนึ่งรายการกับช่วงรับสลิป ยอดที่ต้องชำระ และผลตรวจที่จำเป็น
- ไม่เก็บรูปสลิป, ชื่อผู้โอน, เลขบัญชีผู้โอน หรือ raw Thunder payload ใน Supabase; เก็บเฉพาะ transaction reference, ยอด, flags และ failure code ที่จำเป็นต่อ idempotency/audit
- เปิด RLS และถอนสิทธิ์ `public`, `anon`, `authenticated`; ให้เฉพาะ `service_role` อ่าน/เขียนจาก server route
- เพิ่ม partial unique indexes ป้องกันลูกค้าหนึ่ง LINE มีคำขอรับสลิปพร้อมกันหลายออเดอร์ และป้องกัน transaction reference เดียวถูกใช้ยืนยันหลายออเดอร์
- `prepare_line_order_payment` รับเฉพาะออเดอร์ LINE สถานะ pending ที่ยังมี reservation จริง และผูก payment expiry กับ reservation expiry
- เปลี่ยน `confirm_pending_order` ให้ LINE order ตัดสต็อกไม่ได้หากยังไม่มี payment status `verified`; admin manual order ยังใช้ขั้นตอนเดิมได้
- `complete_line_order_payment` ตรวจ receiver match, amount match, duplicate=false, exact expected amount, slip timestamp และ reservation จากนั้นบันทึกผลพร้อม confirm/ตัดสต็อกใน database transaction เดียว
- เพิ่ม handler รูปภาพจาก LINE: ดาวน์โหลด content ด้วย message ID, จำกัดชนิด JPEG/PNG/GIF/WebP และขนาดไม่เกิน 4 MB แล้วส่ง Thunder API v2 ด้วย `matchAccount=true`, `matchAmount` และ `checkDuplicate=true`
- สลิปผิดยอด, ผู้รับไม่ตรง, ซ้ำ, อ่านไม่ได้, Thunder ขัดข้อง หรือ reservation หมดอายุ จะตอบลูกค้าว่าไม่ผ่านและไม่ตัดสต็อก
- หน้า Admin order ของ LINE เปลี่ยนจากปุ่มตัดสต็อกเองเป็น `ส่งยอดชำระเงินเข้า LINE`; ข้อมูลบัญชีถูกอ่านจาก server-only `PAYMENT_INSTRUCTIONS` และไม่แสดงบนหน้าเว็บสาธารณะ
- การกดบันทึกจัดส่งจะ push บริษัทขนส่งและเลขพัสดุกลับไปยัง verified LINE identity; ลูกค้ายังพิมพ์ `เช็กสถานะออเดอร์` เพื่อดูเลขได้
- Apply migration เข้า Supabase สำเร็จ: `20260908152125_order_payment_verification`
- Verification ยืนยันตารางอยู่จริง, RLS เปิด, `anon`/`authenticated` ไม่มีสิทธิ์ SELECT, `service_role` มีสิทธิ์ และ payment rows = 0
- Supabase security advisor มีเฉพาะ INFO `rls_enabled_no_policy` ตาม server-only deny-by-default design; performance advisor มีเฉพาะ unused-index INFO ก่อนมี traffic
- `npx tsc --noEmit` และ `npm run build` ผ่าน
- ยังไม่สร้าง payment request, ไม่เรียก Thunder ด้วยสลิปจริง และไม่เปลี่ยนสต็อกจริง
- ตั้ง `PAYMENT_INSTRUCTIONS` เป็น server-only secret ใน `.env.local` และ Vercel Production แล้ว โดยไม่บันทึกรายละเอียดบัญชีลงรายงานหรือ source code
- Production deployment สำเร็จ: `dpl_2ihfgQNn6AZXEPN3tvxcmfhpZKUz`, alias `https://www.pod4u.store`, status READY
- Production smoke test ผ่าน: `/` และ `/stock` ตอบ HTTP 200; payment-request endpoint ปฏิเสธผู้ไม่ login ด้วย HTTP 401
- Thunder activation เสร็จแล้ว; เหลือทดสอบด้วยออเดอร์/สลิปจริงที่ควบคุมได้

#### Batch 9A Thunder API v2 documentation alignment

- ตรวจเอกสารทางการ Thunder API v2 วันที่ 8 กันยายน 2026: ใช้ Bearer UUID v4, `POST /v2/verify/bank` แบบ multipart และ flags `matchAccount`, `matchAmount`, `checkDuplicate`
- ยืนยันข้อจำกัดไฟล์ตามเอกสาร: JPEG/PNG/GIF/WebP และไม่เกิน 4 MB ซึ่งตรงกับ validation ฝั่ง LINE webhook
- เพิ่ม strict UUID v4 validation ให้ `THUNDER_API_KEY`; key ผิดรูปแบบจะหยุดก่อนสร้าง payment request หรือส่งข้อมูลบัญชีให้ลูกค้า
- เปลี่ยนการเทียบยอดฝั่งแอปเป็นหน่วยสตางค์ ลดความเสี่ยงจาก floating-point และยังคงตรวจซ้ำใน PostgreSQL ด้วย numeric(12,2)
- ยกเลิกการส่ง LINE message ID เป็น Thunder `remark` เพื่อลดการส่ง opaque customer identifier ให้ third party
- เพิ่ม verified webhook replay handling: LINE event เดิมตอบผลสำเร็จเดิมได้ แต่ database unique transaction reference และ RPC idempotency ป้องกันตัดสต็อกซ้ำ
- เพิ่มข้อความเฉพาะสำหรับ Thunder errors เช่น invalid key, IP restriction, inactive branch, quota exceeded, duplicate, receiver mismatch และ amount mismatch; ทุก failure path ไม่ตัดสต็อก
- `npx tsc --noEmit`, `npm run build` และ `git diff --check` ผ่านหลัง hardening
- Production deployment ล่าสุดสำเร็จ: `dpl_HfGCxAmDthECSvG55VexHkriBTLK`, alias `https://www.pod4u.store`, status READY
- แก้ `THUNDER_API_KEY` ใน `.env.local` จากค่าถูกตัดเหลือ 8 ตัวเป็น UUID v4 ของสาขา `pod4u`; live `/v2/info` ตอบ HTTP 200 และ authenticated สำเร็จโดยไม่เรียกตรวจสลิป
- อัปเดต `THUNDER_API_KEY` เป็น Secret ใน Vercel Production และ redeploy สำเร็จ: `dpl_DphhAS9RwhrBDQWo3DVht6idQhRB`, alias `https://www.pod4u.store`, status READY
- Developer Portal ยืนยันแพ็กเกจ `TEST plan`, โควตา 100 ครั้งต่อเดือน, ใช้แล้ว 0/100, หมดอายุ 23/09/69; ยอด wallet ฿0.00 ไม่ได้ขัดขวางการใช้โควตาฟรีปัจจุบัน
- เพิ่มบัญชีรับเงินใน Thunder Branch สำเร็จ และตรวจผ่าน `GET /v2/bank-accounts` ได้ HTTP 200, 1 บัญชี, bank code `006` (กรุงไทย), ประเภท `NATURAL`, verification `NAME_NUMBER`; รายงานไม่บันทึกชื่ออังกฤษหรือเลขบัญชีเต็ม
- Production LINE webhook smoke test ผ่านด้วย empty event ที่ลงลายเซ็น HMAC-SHA256 จาก channel secret จริง: `POST /api/line/webhook` ตอบ HTTP 200 `{"success":true}` โดยไม่สร้างออเดอร์ ไม่เรียก Thunder และไม่เปลี่ยนสต็อก

---

**Batch 1A–1D และ Batch 3A–9A เสร็จในระดับ Core, Apply/Verify และ Deploy แล้ว; Thunder API key และบัญชีรับเงินพร้อมใช้งานทั้ง local และ Production** — flow เป้าหมายคือ Catalog → LINE-bound registration → LINE verified Draft → Pending reservation → ส่งยอดส่วนตัวใน LINE เท่านั้น → Thunder verified → Confirmed/ตัดสต็อก → Shipped/ส่งเลขพัสดุ → Delivered งานที่เหลือคือ real-user acceptance test จากแอป LINE และเปิด Google stock source โดยคง auto-apply ปิดไว้ก่อน

### Batch 9B — Persistent member session and member order portal

- Added an HMAC-signed LINE member access token with a 10-minute lifetime. The token is carried in a URL fragment and exchanged server-side only after the LINE identity is revalidated.
- Added a signed member session cookie with a 30-day lifetime using HttpOnly, Secure, and SameSite=Lax.
- Successful registration now creates the member cookie and redirects to `/member`.
- A linked LINE user now receives buttons for `เปิดหน้าสมาชิก` and `สั่งซื้อสินค้า` instead of being asked to register again.
- Added `/member` to show the member profile summary, masked phone number, default address, orders, status, carrier, and tracking number.
- Anonymous visitors see only the LINE verification prompt. Invalid access tokens return HTTP 401.
- Local verification passed: `npx tsc --noEmit`, `npm run build`, and `git diff --check`.
- Production deployment: `dpl_49QsSioAURexPUBoWUiXMaF7ento`, READY and aliased to `https://www.pod4u.store`.
- Production verification passed for anonymous isolation, invalid-token rejection, Secure/HttpOnly cookie issuance, and linked-member dashboard access.
- Remaining device acceptance: press the Rich Menu membership action in the real LINE app, then press `เปิดหน้าสมาชิก` once to save the session on that device.

#### Batch 9B Repair — Existing-member loop

- Root cause: the LINE identity used in the latest device test was different from the verified LINE identity already stored for the customer. It therefore could not be safely auto-linked to the existing record.
- Fixed the `ฉันเป็นสมาชิกเดิม` postback so it no longer starts another new-registration session and loops back to the same buttons.
- The existing-member action now gives the one-time six-digit verification flow. Matching by name or phone alone is intentionally not allowed because it could attach the wrong LINE account.
- After a valid one-time code is consumed, the webhook now immediately returns `เปิดหน้าสมาชิก` and `สั่งซื้อสินค้า` buttons. Later membership actions for that LINE identity enter the member portal without registration.
- Verification passed: `npx tsc --noEmit`, `npm run build`, and `git diff --check`.
- Production deployment: `dpl_7dprmcnCtpmm7CzrscvBBVGzqP5t`, READY and aliased to `https://www.pod4u.store`.
- A ten-minute link code was created for the latest real LINE identity and customer #9. Final acceptance remains consumption of that code from the real LINE chat and opening the returned member button.

#### Batch 9C — LIFF member sign-in

- Audited the existing Gromi implementation in `/Users/ironsam/Desktop/Dev/gromi-solar-pages/src/pages/LinkLine.tsx`. It uses `@line/liff`, calls `liff.init()` and `liff.getProfile()`, then persists the LINE user ID in Supabase.
- Pod4U now has a dedicated LINE Login channel `2011511843` and LIFF app `2011511843-ReAPLsJH`. The endpoint is `https://www.pod4u.store/member/liff`, with `openid` and `profile` scopes, and the channel is linked to the Pod4U Official Account.
- Added `/member/liff` and `/api/customers/liff-session`. The browser sends the raw LIFF ID token; the server verifies it with LINE Login v2.1, checks the verified LINE subject against the existing verified `customer_identities` row, and issues the existing HttpOnly member session cookie.
- Updated the default Rich Menu membership area to open the Pod4U LIFF URL directly. The previous Rich Menu remains available for rollback.
- Vercel Production and Preview now contain `LINE_LOGIN_CHANNEL_ID`, `LINE_BOT_USER_ID`, and `NEXT_PUBLIC_LINE_LIFF_ID`.
- Verification passed: `npx tsc --noEmit`, `npm run build`, `git diff --check`, LIFF URL resolves to the Pod4U endpoint, and invalid ID tokens receive HTTP 401 without creating a session.
- Production deployment: `dpl_6ZGfWwoEtdmyWSp8praLfKgpzZD6`, READY and aliased to `https://www.pod4u.store`.
- Rich Menu publish passed: `richmenu-49065fd999e3e9dc03cad59eb4c8cdf9` is the new default.
- Remaining real-device acceptance: open “ระบบสมาชิก” from the LINE Rich Menu. A previously linked customer should enter `/member` directly; a new LINE identity should see the first-time registration message.
- Final LIFF fallback repair deployed as `dpl_4XfcyjLvGDttrUGn5TwHQ7L2Dg1p`: a verified but unregistered LINE identity now receives a one-time registration URL from the LIFF session endpoint, so first-time signup also starts from the same Rich Menu action.
- LINE Login channel `2011511843` was published on 09 Sep 2026, making the LIFF member sign-in available to LINE users outside the developer account.
- Member ordering UX was clarified for mobile: the dashboard now starts with a prominent three-step order guide and a full-width `เลือกสินค้าและเพิ่มลงตะกร้า` action; the stock page repeats the cart instruction clearly and uses a single product column on narrow screens so the add-to-cart control is not missed.
- The member-ordering UX repair was deployed to production as `dpl_CRks7g1DKVMyk81YeTVrwGTen8zf` (READY, aliased to `https://www.pod4u.store`). Production browser verification confirmed the stock page exposes the add-to-cart action and adding a real catalog item updates the cart count from empty to 1.
- Cart removal controls were clarified for mobile: every item now has a visible red `ลบ` action with the product name in its accessible label, while `ลบสินค้าทั้งหมดออกจากตะกร้า` requires confirmation before clearing the cart.
- Cart removal UX deployed to production as `dpl_9a9djUqoYdTx7wWkxYsK5CKJg2NT` (READY). Production browser verification confirmed the visible per-item `ลบ`, full-cart removal, and `ส่งรายการเข้า LINE` controls are present together in the cart drawer.
- Customer-facing order flow was simplified: linked members can cancel their own draft orders from `/member`; cancellation is an atomic customer-id-and-draft-status update, so another customer's order or an already approved order cannot be cancelled. LINE replies no longer expose internal `Draft` terminology and link directly back to the member portal.
- LINE order approval in the admin detail page is now one action, `ยืนยันสต็อกและส่งยอดเข้า LINE`, which reserves available stock and creates/sends the payment request. Existing separate retry behavior remains available once an order is pending.
- The simplified member cancellation and one-click LINE approval flow was deployed as `dpl_88EAEGMYxhAbM9Ps9yFLL55wRm6D` (READY, aliased to `https://www.pod4u.store`). Production authorization smoke tests passed: unauthenticated member cancellation and admin approval both return HTTP 401.

### Batch 9D — Member draft order editing and order-history cleanup

- หน้า `/member` แยกออเดอร์ที่กำลังดำเนินการออกจากประวัติที่ยกเลิก/ส่งถึงแล้ว ลดความรกเมื่อมี test orders จำนวนมาก
- ออเดอร์สถานะ `draft` มีปุ่ม `แก้ไข / ลบสินค้า` และ `ยกเลิกออเดอร์`; การยกเลิกเป็น soft cancel และย้ายไปประวัติ ไม่ hard-delete audit trail
- ปุ่มแก้ไขโหลด snapshot ของออเดอร์เดิมกลับเข้าตะกร้า ลูกค้าจึงเพิ่มสินค้า ลด/เพิ่มจำนวน หรือลบสินค้าได้จาก UI เดิม
- ตะกร้าแสดงโหมดแก้ไขพร้อมเลขออเดอร์ และใช้ `บันทึกการแก้ไขออเดอร์` เพื่ออัปเดตออเดอร์เดิมโดยไม่สร้างเลขออเดอร์ซ้ำ
- เพิ่ม RPC `update_member_draft_order` เพื่อ lock, ตรวจ ownership/status, อ่านชื่อ SKU และราคาจากฐานข้อมูล แล้วแทนที่รายการพร้อมคำนวณยอดใหม่ใน transaction เดียว
- จำกัดการแก้ไขไว้เฉพาะ `draft`; เมื่อร้านจองสินค้าแล้ว ลูกค้าต้องติดต่อผ่าน LINE เพื่อไม่ให้ reservation และ stock ผิดกัน
- Apply migration สำเร็จ: `20260908214151_member_draft_order_management`; transaction rollback verification ผ่านโดยไม่เปลี่ยนออเดอร์จริง
- Supabase security advisor หลัง migration ไม่มี warning/error ใหม่; INFO `rls_enabled_no_policy` ยังคงเป็น server-only deny-by-default design เดิม
- `npm run build` ผ่านทั้ง local และ Vercel Production; unauthenticated edit API ถูกปฏิเสธด้วย HTTP 401
- Production deployment: `dpl_AvdwihQhaWqUtXgx7kUt5Tj5ud3e`, READY and aliased to `https://www.pod4u.store`.

### Batch 9E — Customer-confirmed stock and automatic payment handoff

- เปลี่ยน LINE order flow จากรอแอดมินยืนยัน เป็นให้ลูกค้ากด `ยืนยันและจองสต๊อก` ใน quick reply หลังส่งรายการ
- postback ตรวจว่าเป็น private LINE user ที่ verified และเป็นเจ้าของออเดอร์ LINE นั้นจริง ก่อนเรียก atomic stock reservation
- เมื่อจองสต๊อกสำเร็จ ระบบสร้าง payment request และส่งยอดกับข้อมูลชำระเงินใน LINE อัตโนมัติ; การกดซ้ำใช้ reservation/payment idempotent replay เดิม
- หน้า Admin ของ LINE draft ไม่มีปุ่มยืนยันสต๊อกอีกต่อไป และแสดง `รอลูกค้ากดยืนยันและจองสต๊อกใน LINE`; ปุ่มส่งข้อมูลชำระเงินซ้ำของ pending order ยังอยู่เป็น operational fallback
- ข้อความลูกค้าไม่ใช้คำว่า `ตัดสต๊อกจริง` หรือ `ยังไม่ตัดสต๊อก`; ใช้ `ระบบจะยืนยันออเดอร์ให้กับลูกค้าหลังจากตรวจเช็กสลิปเรียบร้อยแล้ว`
- หลัง Thunder ตรวจสลิปผ่าน ข้อความยืนยันแจ้งว่าออเดอร์ยืนยันแล้ว และ `เลข Tracking พัสดุจะสามารถเข้าไปเช็กได้ในระบบสมาชิกวันพรุ่งนี้`
- สถานะ member/LINE ปรับเป็น `รอลูกค้ายืนยันสต๊อก` และ `จองสินค้า/รอตรวจสลิป` ให้ตรงกับ flow จริง
- `npm run build` และ `git diff --check` ผ่าน; production LINE webhook HMAC smoke test ตอบ HTTP 200 โดยใช้ empty event และไม่เปลี่ยนข้อมูล
- Production deployment: `dpl_6iEEJzd5fgFpLizg6qjWAQsmxk5T`, READY and aliased to `https://www.pod4u.store`.

#### Batch 9E Admin fallback repair

- Restored a clear admin fallback alongside customer self-confirmation: LINE draft orders now expose `ยืนยันสต๊อกและส่งข้อมูลชำระเงินเข้า LINE` on the order detail page.
- The admin order table now has a `จัดการ` column; draft rows show a prominent `ตรวจและยืนยัน` action and other states show `เปิดออเดอร์`.
- Updated admin status labels to `รอยืนยันสต๊อก` and `จองแล้ว / รอสลิป` so the next action is visible without opening every row.
- Browser verification on authenticated production admin passed for both the list action and the full detail action. The button was not clicked during verification, so no stock reservation, payment request, or LINE message was created.
- Production deployment: `dpl_CgW1YNCGmvR8sekwh45EZT86aNhu`, READY and aliased to `https://www.pod4u.store`.

#### Batch 9E Customer-language cleanup

- Removed customer/admin-facing references to internal implementation names such as Thunder and Draft from payment and order-operation messages.
- Customer payment failures now use plain language such as `ยังไม่สามารถตรวจสอบการชำระเงินได้ในขณะนี้` without exposing API key, IP restriction, quota, provider, or database terminology.
- Admin order screens now use action-oriented Thai: `รอยืนยันสต๊อก`, `จองแล้ว / รอตรวจการชำระเงิน`, `ตรวจสอบเรียบร้อยแล้ว`, and `รายการนี้ยังไม่ได้ยืนยัน`.
- Internal variable names, database status values, and provider integration code remain unchanged so behavior and auditability are preserved.
- `npm run build` and `git diff --check` passed.
- Production deployment: `dpl_3k2z2JJEBAA73pnimJUGsEFBgiqm`, READY and aliased to `https://www.pod4u.store`.

### Batch 9F — Visible member cancellation before payment

- ย้ายการจัดการออเดอร์ออกจากความคาดหวังเรื่องเมนู hamburger: หน้า `/member` ระบุชัดว่าแก้ไขหรือยกเลิกได้จากปุ่มบนการ์ดออเดอร์โดยตรง
- ออเดอร์ `draft` ยังมี `แก้ไขสินค้าในออเดอร์` และ `ยกเลิกออเดอร์` เหมือนเดิม ส่วนออเดอร์ `pending` เพิ่มปุ่มเด่น `ยกเลิกก่อนชำระเงิน`
- ไม่อนุญาตให้ลูกค้ายกเลิกออเดอร์ที่ตรวจสอบการชำระเงินแล้ว; สถานะ `confirmed`, `shipped` และ `delivered` ต้องติดต่อเจ้าหน้าที่ใน LINE
- เพิ่ม RPC `cancel_member_unpaid_order` แบบ atomic ซึ่ง lock ออเดอร์ ตรวจ customer ownership ตรวจสถานะ draft/pending และปฏิเสธ verified payment ก่อนเรียก cancellation workflow เดิม
- การยกเลิก pending จะ release stock reservation และเปลี่ยน payment request ที่ยังรอสลิปเป็น cancelled ใน transaction เดียว โดยเก็บออเดอร์เป็น soft-cancelled audit history
- จำกัด RPC ให้เรียกผ่าน `service_role` เท่านั้น ใช้ `SECURITY INVOKER` และ `search_path = ''`; anon/authenticated ไม่มีสิทธิ์ execute
- Applied migration: `20260909063108_member_unpaid_order_cancellation`
- Transaction rollback verification ผ่านกับ pending order ที่มี active reservation/payment request และยืนยันว่า order/payment/reservation เปลี่ยนครบภายใน transaction ก่อน rollback; ownership-negative test ผ่านโดยไม่แก้ข้อมูลจริง
- Supabase security advisor ไม่มี warning/error ใหม่; INFO `rls_enabled_no_policy` ยังคงเป็น server-only deny-by-default design เดิม
- `npm run build` และ `git diff --check` ผ่าน
- Production mobile browser verification ยืนยันว่าการ์ด pending แสดงสถานะ `จองสินค้า / รอชำระเงิน`, คำอธิบาย และปุ่ม `ยกเลิกก่อนชำระเงิน` โดยไม่ต้องเปิดเมนู ☰; ไม่ได้คลิกปุ่มระหว่าง verification จึงไม่มีออเดอร์จริงถูกยกเลิก
- Production deployment: `dpl_AC4GBiRw2LoCeZtYUqZdMjLy6JrM`, READY and aliased to `https://www.pod4u.store`.

### Batch 9G — Member self-service profile and shipping address

- เพิ่มปุ่ม `แก้ไขชื่อและข้อมูลจัดส่ง` ในการ์ดข้อมูลจัดส่งของหน้า `/member` โดยไม่ซ่อน action ไว้ใน hamburger menu
- สมาชิกแก้ชื่อ-นามสกุล เบอร์โทรศัพท์ ชื่อผู้รับ ที่อยู่ จังหวัด และรหัสไปรษณีย์ได้ในฟอร์มเดียว พร้อม validation ภาษาไทยและ mobile-friendly inputs
- ระบุใน UI ว่าข้อมูลใหม่ใช้กับออเดอร์ใหม่ ส่วนออเดอร์ที่ส่งเข้า LINE แล้วเก็บ shipping snapshot เดิมเพื่อความถูกต้องของ audit/order fulfillment
- เพิ่ม member-cookie authenticated API `PATCH /api/customers/profile`; customer id อ่านจาก signed HttpOnly session เท่านั้นและไม่รับ customer id จาก client
- เพิ่ม atomic RPC `update_member_profile` เพื่อ lock สมาชิก อัปเดต customer profile และ default address ใน transaction เดียว; รองรับการสร้าง default address ครั้งแรกเมื่อยังไม่มี
- RPC เป็น `SECURITY INVOKER`, `search_path = ''`, revoke จาก public/anon/authenticated และ grant เฉพาะ service_role
- Applied migration: `20260909064401_member_profile_management`
- Transaction rollback verification ผ่านด้วยข้อมูลเดิมโดยไม่เปลี่ยนข้อมูลจริง; permission verification ยืนยัน anon/authenticated เรียก RPC ไม่ได้และ service_role เรียกได้
- Supabase security advisor ไม่มี warning/error ใหม่; INFO `rls_enabled_no_policy` ยังคงเป็น server-only deny-by-default design เดิม
- `npm run build` และ `git diff --check` ผ่าน; production authenticated HTML แสดงปุ่มแก้ไข, invalid authenticated request ตอบ 400 และ unauthenticated request ตอบ 401
- Production deployment: `dpl_ERKquCCeE4XdP3MC9Z5NiY7tpamD`, READY and aliased to `https://www.pod4u.store`.

### Batch 9H — Standardized member dashboard UX

- ปรับหน้า `/member` เป็น account dashboard มาตรฐาน โดยเรียงข้อมูลตามความสำคัญ: โปรไฟล์สมาชิก → เมนูด่วน → สรุปบัญชี → ออเดอร์ที่กำลังดำเนินการ → ข้อมูลส่วนตัว/ที่อยู่ → ประวัติ
- เพิ่มเมนูสมาชิกที่มองเห็นทันที 3 รายการ: `สั่งซื้อสินค้า`, `ออเดอร์ของฉัน` และ `ข้อมูลของฉัน`; การใช้งานหลักไม่ต้องเปิด hamburger menu
- ลดคำแนะนำสั่งซื้อแบบยาวและเปลี่ยนเป็น action cards ที่กดได้ทันที พร้อม anchor navigation ภายในหน้า
- เพิ่มสถานะออเดอร์แบบ color-coded, label `เลขที่ออเดอร์`, ยอดรวม และสถานะจัดส่งให้อ่านได้เร็วบนมือถือ
- แยก active orders กับ collapsed order history ชัดเจน และคงปุ่มแก้ไข/ยกเลิกไว้บนการ์ดออเดอร์โดยตรง
- ปิด welcome marketing popup, marketing footer และ floating LINE button เฉพาะ member portal เพื่อไม่บังข้อมูลหรือปุ่มจัดการออเดอร์
- ปรับปุ่มออกจากระบบบนมือถือเป็น `ออก` พร้อม accessible name เต็ม เพื่อไม่เบียดชื่อสมาชิก
- `npm run build` และ `git diff --check` ผ่าน
- Production mobile browser verification ที่ viewport 390×844 ผ่าน: เมนูด่วนครบ, ชื่อสมาชิกอ่านได้, active order actions แสดง และไม่มี popup/footer/floating LINE button มาบังหน้า
- Production deployment: `dpl_4gS5jh6jtWwEHmxuwRWR8EpPUZDU`, READY and aliased to `https://www.pod4u.store`.

### Batch 9I — Direct Pod4U member login

- เพิ่มหน้าเข้าสู่ระบบสมาชิกโดยตรงที่ `/member` ใช้เบอร์โทรศัพท์และรหัสผ่าน ไม่ redirect ไป LINE และมีทางเข้าสมัครสมาชิกใหม่จากหน้าเดียวกัน
- สมาชิกที่มี signed member session อยู่แล้วตั้งหรือเปลี่ยนรหัสผ่านได้จากหัวข้อ `ข้อมูลของฉัน`; สมาชิกใหม่ที่สมัครผ่านเว็บตั้งรหัสผ่านต่อได้ทันทีหลังสมัคร
- สมาชิกเดิมที่ยังไม่เคยตั้งรหัสผ่านต้องยืนยันตัวตนผ่าน LINE เดิมเพียงครั้งเดียวเพื่อเปิด session แล้วตั้งรหัสผ่าน หลังจากนั้นเข้า `pod4u.store/member` ได้โดยตรง
- ใช้ Supabase Auth จัดเก็บและตรวจรหัสผ่าน ไม่สร้าง password hash เองในตาราง application
- เพิ่ม server-only mapping `member_auth_accounts` ระหว่าง customer id กับ Supabase Auth user โดยใช้อีเมลภายในแบบ opaque HMAC; เบอร์โทรที่ลูกค้าเปลี่ยนภายหลังจึงยังผูกกับ Auth account เดิม
- Login API ตอบข้อความแบบ generic เมื่อเบอร์หรือรหัสผ่านไม่ถูกต้อง และออก signed HttpOnly/Secure/SameSite=Lax member cookie อายุ 30 วันหลังตรวจ Auth user และ mapping ตรงกันเท่านั้น
- ตาราง mapping เปิด RLS, ไม่มี public policy, `anon`/`authenticated` ไม่มีสิทธิ์อ่าน และให้ CRUD เฉพาะ `service_role`; service role key ไม่ถูกส่งไป browser
- Applied migration: `20260909073324_member_web_password_auth`
- Verification ผ่าน: migration rollback validation, production schema/permission query, Supabase security advisor (เฉพาะ INFO ที่คาดไว้สำหรับ server-only deny-by-default), `npm run build`, `git diff --check`, หน้า `/member` ตอบ 200, unauthenticated password update ตอบ 401 และ invalid login ตอบ generic 401
- `ลืมรหัสผ่าน` ระยะแรกส่งไปติดต่อเจ้าหน้าที่ผ่าน LINE; ยังไม่มี SMS reset เพื่อไม่เพิ่มผู้ให้บริการและค่าใช้จ่ายก่อนจำเป็น
- เพิ่ม hidden username field ในฟอร์มตั้งรหัสผ่านเพื่อรองรับ browser/password manager ตามมาตรฐาน โดย browser console ไม่มี error หรือ warning
- Production mobile browser verification ที่ viewport 390×844 ผ่านทั้งหน้า login โดยตรง, generic invalid-credential message และหน้าตั้งรหัสผ่านของสมาชิกที่ authenticated; ไม่ได้บันทึกรหัสผ่านใหม่ให้บัญชีจริงระหว่าง verification
- Production deployment: `dpl_HjzdzYoHoKBdgyAYUqbKpLWHBPdy`, READY and aliased to `https://www.pod4u.store`.

#### Batch 9I Repair — Member catalog back navigation

- เมื่อเข้าหน้า `/stock?source=member` จากระบบสมาชิก จะแสดงปุ่ม `← กลับหน้าสมาชิก` เหนือหัวข้อสินค้าพร้อมส่งอย่างชัดเจนทั้งมือถือและเดสก์ท็อป
- หน้า `/stock` ที่เปิดจากเว็บทั่วไปไม่แสดงปุ่มเฉพาะสมาชิกนี้
- `npm run build` และ `git diff --check` ผ่าน
- Production browser verification ที่ viewport 390×844 ยืนยันว่าปุ่มแสดงจริงและกดกลับไป `/member` ได้สำเร็จ
- Production deployment: `dpl_2sEPvrnwn6izBvmd3t65MtK13idL`, READY and aliased to `https://www.pod4u.store`.

### Batch 9J — Admin order work queue and unpaid-order expiry

- ปรับหน้า `/admin/orders` จากตารางรวมที่รายการยกเลิกปะปน เป็นคิวงานตามขั้นตอนจริง: `รอตรวจออเดอร์`, `รอลูกค้าชำระ`, `เตรียมจัดส่ง` และ `จัดส่งแล้ว`
- ค่าเริ่มต้นแสดงเฉพาะงานที่กำลังดำเนินการ; รายการสำเร็จ/ยกเลิกแยกอยู่ในตัวกรองประวัติและยังเปิดดูย้อนหลังได้
- แต่ละรายการระบุ source ชัดเจนเป็น `LINE OA Pod4U · สมาชิกเชื่อมแล้ว` หรือ `แอดมินบันทึก` พร้อม next action, ยอด, ลูกค้า, เบอร์ท้าย และกำหนดชำระ
- ยกเลิกปุ่มส่งข้อมูลชำระเงินซ้ำจากหน้าออเดอร์ LINE pending เพื่อลดความสับสนและป้องกันแอดมินส่งข้อความรบกวนลูกค้าโดยไม่จำเป็น
- ข้อความชำระเงินครั้งแรกแจ้งชัดว่าหากไม่ส่งสลิปภายในเวลาที่กำหนด ออเดอร์จะยกเลิกอัตโนมัติและต้องสั่งใหม่
- เพิ่ม `cancel_expired_unpaid_line_orders()` และ Supabase Cron `pod4u-cancel-expired-unpaid-orders` ทุก 5 นาที; งานนี้ยกเลิกเฉพาะ LINE order สถานะ pending ที่ payment request ยังรอสลิปและหมดเวลาแล้ว โดยไม่เรียก LINE API
- Applied migration: `20260909084448_automatic_unpaid_order_expiry`; cron job active และ expired unpaid order คงเหลือ 0 หลัง verification
- `npm run build` ผ่าน; `npm run lint` ยังใช้ไม่ได้เพราะ repository ไม่มี ESLint config และคำสั่งเปิด interactive setup เดิม
- Production browser verification ผ่านใน authenticated admin: ค่าเริ่มต้นไม่แสดงรายการยกเลิก, คิวงานทั้ง 4 แสดงจำนวนถูกต้อง และแท็บประวัติแสดง source เป็น `LINE OA Pod4U · สมาชิกเชื่อมแล้ว` พร้อม next action ที่อ่านได้
- Production deployment: `dpl_58BBu2Y5jZwrjeMSWz1J4VRYv9dA`, READY and aliased to `https://www.pod4u.store`; post-deploy error log scan ไม่พบ error

#### Batch 9J Repair — LINE intent routing and current business hours

- ยกเลิก generic fallback ที่ตอบคู่มือสั่งซื้อซ้ำกับทุกข้อความ; คำถามเฉพาะสินค้าและบทสนทนาทั่วไปถูกส่งต่อให้เจ้าหน้าที่โดย webhook ตอบ HTTP 200 แต่ไม่ส่ง LINE reply
- เพิ่ม deterministic intents สำหรับค่าส่ง, รอบจัดส่ง, วันเปิดร้าน, การชำระเงิน, tracking และการยกเลิก โดยไม่ใช้ generative AI
- ข้อมูลปัจจุบัน: ร้านเปิดทุกวัน ไม่มีวันหยุด; รับรายการได้ 24 ชั่วโมง; ชำระเงินและส่งสลิปภายใน 15:00 น. จัดส่งภายในวันนั้น และหลัง 15:00 น. จัดส่งวันถัดไป
- คำตอบค่าส่งระบุค่าจัดส่งทั่วไทย 50 บาท และเฉพาะสินค้าดูดแล้วทิ้งตั้งแต่ 3 ชิ้นขึ้นไปส่งฟรี พร้อมรอบจัดส่ง 15:00 น.
- อัปเดต FAQ หน้าเว็บให้ใช้รอบจัดส่งและวันเปิดร้านชุดเดียวกับ LINE webhook
- `npm run build`, `git diff --check` และ signed production webhook smoke tests สำหรับ `รอบจัดส่งกี่โมง`, `ร้านเปิดวันไหน`, `ค่าส่งเท่าไหร่` ผ่านด้วย HTTP 200
- Production deployments: intent routing `dpl_J1Bc1dti3A8cXCRYu2QA8exFR6L7`; final business-hours update `dpl_385dw724AkTZyAkRJiKAVqpsWhA5`.

#### Batch 9J Repair — LINE intent-aware replies

- แก้ fallback เดิมที่ตอบคู่มือสั่งซื้อข้อความยาวซ้ำกับทุกข้อความ แม้ลูกค้ากำลังถามคำถามเฉพาะสินค้า
- เพิ่ม deterministic intent สำหรับคำถามค่าส่ง การชำระเงิน เลขพัสดุ การยกเลิก สินค้าพร้อมส่ง ราคา สถานะออเดอร์ และคำทักทาย
- คำถามที่ระบบไม่มีข้อมูลแน่ชัด เช่น การยืนยันรายละเอียดรุ่นหรือจำนวนหัว จะไม่ตอบเดาและไม่ส่ง fallback; ข้อความยังอยู่ใน LINE OA Manager เพื่อให้เจ้าหน้าที่ตอบต่อ
- จำกัด free-text product search ให้ทำงานกับเจตนาสั่งซื้อที่ชัดเจน และไม่ใช้คำทั่วไป `เอา` เป็น trigger อีกต่อไป
- คำทักทายเปลี่ยนเป็นเมนูข้อความสั้น ไม่ส่งคู่มือยาวซ้ำทุกครั้ง
- `npm run build` และ signed production webhook smoke test 3 กรณีผ่านด้วย HTTP 200: ค่าส่ง, คำถามเฉพาะสินค้า และคำทักทาย
- Production deployment: `dpl_J1Bc1dti3A8cXCRYu2QA8exFR6L7`, READY and aliased to `https://www.pod4u.store`; post-deploy error log scan ไม่พบ error

#### Batch 9J Correction — Disposable-only free shipping policy

- ยกเลิกเงื่อนไขส่งฟรีตามยอด 800 บาททุกจุด
- กติกาที่ถูกต้อง: เฉพาะสินค้าดูดแล้วทิ้งตั้งแต่ 3 ชิ้นขึ้นไปส่งฟรี; รายการอื่นค่าจัดส่งทั่วไทย 50 บาท
- อัปเดต LINE shipping intent, FAQ, hero, benefits, footer, trust badge และ free-shipping banner ให้ใช้เงื่อนไขเดียวกัน
- เพิ่ม `npm run test:shipping-policy` เพื่อตรวจไม่ให้ข้อความหรือ config เดิมแบบครบ 800 บาทส่งฟรีกลับเข้ามาอีก
- `npm run test:shipping-policy`, `npm run build` และ `git diff --check` ผ่าน
- Production deployment: `dpl_4UEzYMoJ6cuim3vLVZBibg16TXC9`, READY and aliased to `https://www.pod4u.store`.
- เพิ่ม `orders.shipping_fee` และกฎคำนวณยอดจริงในฐานข้อมูล: ออเดอร์ที่มีเฉพาะหมวด `disposable-pod` รวมตั้งแต่ 3 ชิ้นคิดค่าส่ง 0 บาท; กรณีอื่นคิด 50 บาท
- กฎคำนวณทำงานอัตโนมัติเมื่อสร้างหรือแก้ไขรายการสินค้า และบังคับให้ `total = subtotal + shipping_fee`; ยอดที่ส่งให้ตรวจสลิปจึงใช้ยอดรวมค่าจัดส่งแล้ว
- Applied migration: `20260909095449_add_disposable_shipping_policy`
- Verification ผ่าน: 3 disposable = 0 บาท, 2 disposable = 50 บาท, 3 non-disposable = 50 บาท; rollback-only tests ผ่านทั้งการกระตุ้น trigger บนออเดอร์เดิมและการสร้างออเดอร์จำลอง 3/2 ชิ้น โดยไม่มีข้อมูลทดสอบค้างในระบบ
- Final production deployment with automatic shipping totals: `dpl_6KcKbb5M78EJbE1ip1AoYEZLKErA`, READY and aliased to `https://www.pod4u.store`.

#### Batch 9J Copy Repair — Consistent LINE voice

- ปรับข้อความอัตโนมัติของร้านให้ใช้เสียงผู้หญิงแบบเดียวกัน คือ `ค่ะ/นะคะ` และยกเลิกข้อความผสม `ครับ/ค่ะ`
- ครอบคลุม LINE webhook, ข้อความหลังสมัครสมาชิก และข้อความสรุปตะกร้าที่ส่งเข้า LINE
- คงคำว่า `ครับ` ไว้เฉพาะข้อความลูกค้าที่ระบบต้องรู้จักและข้อความรีวิวที่เป็นคำพูดของผู้รีวิว ไม่ใช่เสียงของร้าน
- เพิ่ม `npm run test:line-copy` ป้องกัน mixed-gender copy กลับมาใน customer flow
- Production deployment: `dpl_2wPUSc95PPrD75Gz3x144NMA1kRT`, READY and aliased to `https://www.pod4u.store`.

#### Batch 9K Repair — Thunder receiver matching

- ตรวจสลิปจริงแบบปกปิดข้อมูลพบว่า Thunder อ่านชื่อผู้รับจาก KTB เป็นชื่ออังกฤษแบบย่อ ซึ่งไม่ตรงกับการสะกดอังกฤษที่ลงทะเบียนไว้ แม้เลขบัญชีและธนาคารถูกต้อง
- อัปเดตชื่ออังกฤษของบัญชีรับเงินใน Thunder branch ให้ตรงกับข้อมูลที่ธนาคารส่งมา โดยไม่เปลี่ยนธนาคาร เลขบัญชี หรือชื่อไทย
- ทดสอบสลิปเดิมกับ Thunder สำเร็จ: HTTP 200, ยอด 250 บาทตรง และ `matchedAccount` ไม่เป็น null
- ปิด Thunder branch-level duplicate check สำหรับการ verify เพราะ Thunder นับแม้ความพยายามที่จับคู่บัญชีไม่ผ่าน ทำให้ลูกค้าส่งสลิปเดิมแก้ตัวไม่ได้
- ยังคงป้องกันสลิปซ้ำอย่างเด็ดขาดด้วย unique `provider_transaction_ref` ใน Supabase และ atomic `complete_line_order_payment`; สลิปเดียวจึงไม่สามารถยืนยันหลายออเดอร์ได้
- เพิ่ม `npm run test:payment-guards`; payment guard, LINE copy, shipping policy, production build และ `git diff --check` ผ่าน
- Production deployment: `dpl_A42KR4Si44FPxUdjoLHTVzJHMdPQ`, READY and aliased to `https://www.pod4u.store`.

### Batch 9L — Member tracking dashboard and admin shipment UX

- ปรับการ์ดออเดอร์ใน `/member` ให้แสดงขั้นตอน `รับออเดอร์ → รอชำระ → เตรียมจัดส่ง → จัดส่งแล้ว` และอธิบายช่วงรอเลขพัสดุอย่างชัดเจน
- เมื่อมีเลขพัสดุแล้ว การ์ดเดิมจะแสดงบริษัทขนส่ง เลขพัสดุ ปุ่มติดตาม ปุ่มคัดลอก และเวลาอัปเดตล่าสุด โดยไม่ให้ลูกค้ากรอกเลขออเดอร์ใหม่
- ปรับหน้า order detail ของแอดมินสำหรับออเดอร์ที่ชำระแล้วเป็นกล่อง `ใส่เลขพัสดุและแจ้งลูกค้า`: เลือกบริษัทขนส่ง กรอกเลขพัสดุ และบันทึกด้วยปุ่มเดียว
- หลังบันทึก ระบบเปลี่ยนออเดอร์เป็น shipped, อัปเดตหน้า member และส่ง LINE หนึ่งครั้งพร้อมลิงก์กลับเข้าหน้าออเดอร์
- เปลี่ยน Rich Menu `เช็กสถานะออเดอร์` จากข้อความ postback เป็น LIFF URL `?next=orders`; LIFF ตรวจตัวตนแล้วเปิด `/member#orders` โดยตรง
- Rich Menu validation ผ่านและ publish เป็น default สำเร็จ: `richmenu-1818946793f6312b54679b1ee4b5a11c`; เก็บ Rich Menu เดิมไว้สำหรับ rollback
- Verification ผ่าน: `npm run test:line-copy`, `npm run test:payment-guards`, `npm run test:shipping-policy`, `npm run build`, `git diff --check` และ production browser verification แบบ authenticated ทั้ง member/admin; console error ทั้งสองหน้าเป็น 0
- Production deployment: `dpl_9ZwTBVhvj3GSV35JgvMGY4LYpdcC`, READY and aliased to `https://www.pod4u.store`.

#### Batch 9L Repair — Customer confirmation of products and shipping details

- ข้อความ `รับออเดอร์แล้ว` ใน LINE แสดงรายการสินค้า จำนวน ราคาต่อชิ้น ยอดรวม ชื่อผู้รับ เบอร์โทร และที่อยู่จัดส่งก่อนให้ลูกค้ายืนยัน
- เปลี่ยนปุ่มเป็น `ข้อมูลถูกต้อง ยืนยัน` และข้อความย้ำให้ตรวจสินค้า เบอร์โทร และที่อยู่; ปุ่มแก้ไขเปิดตรงหน้าออเดอร์ใน LIFF
- จำกัดรายการที่แสดงในข้อความ LINE ไว้ 12 รายการเพื่อไม่เกิน message limit; รายการที่เหลือให้ตรวจครบในระบบสมาชิก
- การ์ด draft/pending ใน `/member` เพิ่มกล่อง `ตรวจสอบก่อนยืนยัน` แสดงรายการสินค้าและ shipping snapshot ของออเดอร์ ไม่ใช้เพียงข้อมูลโปรไฟล์ปัจจุบัน
- เมื่อสมาชิกแก้ชื่อ เบอร์ หรือที่อยู่ ระบบอัปเดต default address และ shipping snapshot ของออเดอร์สถานะ `draft` ของสมาชิกคนเดียวกันแบบ atomic; ไม่แก้ออเดอร์ pending/confirmed/shipped/delivered ย้อนหลัง
- Applied migration: `20260909121213_sync_draft_order_shipping_on_profile_update`; rollback-only integration verification ผ่านและไม่มีข้อมูลทดสอบค้าง
- Security advisor หลัง migration ไม่มี finding ใหม่จากฟังก์ชัน; คง INFO สำหรับ server-only RLS-without-policy tables และ WARN เดิมเรื่อง leaked-password protection
- Verification ผ่าน: LINE copy test, payment guard test, shipping policy test, Next.js production build, `git diff --check` และ authenticated member production smoke test ไม่มี console error
- Production deployment: `dpl_FJ3HkXLptsR3KbjrXUpgWVfqtdSn`, READY and aliased to `https://www.pod4u.store`.

### Batch 10A — Verified Order Reviews and ฿5 Review Reward

#### Business Rules

- ลูกค้าที่มีออเดอร์สถานะ `delivered` สามารถรีวิวได้หนึ่งรีวิวต่อออเดอร์
- รีวิวต้องมีคะแนน 1–5 และข้อความ 10–2000 ตัวอักษร
- หมวดหมู่รีวิว: สินค้า, การจัดส่ง, บริการ, ประสบการณ์โดยรวม
- รีวิวที่ส่งแล้วจะเข้าสู่สถานะ `pending` รอตรวจสอบจากแอดมินก่อนเผยแพร่
- เมื่อแอดมินอนุมัติ ระบบจะออกส่วนลด ฿5 ให้ลูกค้าโดยอัตโนมัติและเปลี่ยนสถานะเป็น `approved`
- เมื่อแอดมินปฏิเสธ ลูกค้าสามารถแก้ไขและส่งใหม่ได้ โดยระบบจะเปลี่ยนกลับเป็น `pending`

#### Ethical Moderation Rule

- แอดมินต้องตรวจสอบว่ารีวิวเป็นการซื้อจริงและไม่เปิดเผยข้อมูลส่วนตัว
- ห้ามปฏิเสธรีวิวเพียงเพราะคะแนนต่ำหรือมีข้อความวิจารณ์ตามสมควร
- ปฏิเสธได้เฉพาะ: สแปม, เนื้อหาไม่เกี่ยวข้อง, เนื้อหาที่ไม่เหมาะสม, เปิดเผยข้อมูลส่วนบุคคล, รีวิวซ้ำ, หรือเนื้อหาที่ไม่ได้บรรยายออเดอร์ที่ส่งจริง
- ต้องระบุเหตุผลทุกครั้งที่ปฏิเสธ

#### Schema and Indexes

Local migration prepared: `20260909124401_verified_order_reviews.sql`

New tables:
- `order_reviews`: รีวิวจากลูกค้า (id uuid, order_id uuid unique, customer_id integer, rating smallint 1–5, category text, review_text text, status text, rejection_reason text, submitted_at timestamptz, moderated_at timestamptz, moderated_by text, published_at timestamptz)
- `customer_discount_credits`: ส่วนลดสะสม (id uuid, customer_id integer, source_type text, source_review_id uuid unique, amount numeric, status text, reserved_order_id uuid, redeemed_order_id uuid, created_at timestamptz)

Indexes:
- `order_reviews(customer_id)`, `(status)`, `(category)`, `(submitted_at desc)`
- `customer_discount_credits(customer_id)`, `(status, customer_id)`, `(source_review_id)`

Database functions (SECURITY INVOKER, service_role only):
- `submit_order_review()`: สร้างรีวิวพร้อม validation (order ownership, delivered status, idempotency)
- `update_rejected_review()`: แก้ไขรีวิวที่ถูกปฏิเสธและส่งใหม่
- `approve_order_review()`: อนุมัติรีวิวและออกส่วนลด ฿5 แบบ atomic; idempotent
- `reject_order_review()`: ปฏิเสธรีวิวพร้อมเหตุผล; idempotent
- `get_customer_available_credit()`: คืนยอดส่วนลดที่ใช้ได้

RLS: เปิดทั้งสองตาราง, revoke จาก public/anon/authenticated, grant เฉพาะ service_role

#### Authorization Model

- Member session verification: ใช้ signed member cookie, derive customer_id จาก session ไม่ใช่จาก browser input
- Review submission: ตรวจ order ownership และ delivered status ใน database function
- Admin moderation: ต้องมี permission `reviews.moderate` (owner, manager, order_staff, support)
- Public reviews: อ่านได้เฉพาาะ approved reviews ผ่าน server-side projection

#### Member UX

- หน้า `/member`: แสดงปุ่ม "รีวิวเพื่อรับส่วนลด ฿5" บนการ์ดออเดอร์ delivered ที่ยังไม่มีรีวิว
- รีวิว pending: แสดง "ส่งรีวิวแล้ว · รอตรวจสอบ"
- รีวิว approved: แสดง "รีวิวได้รับการเผยแพร่แล้ว" และ "ได้รับส่วนลด ฿5 แล้ว"
- รีวิว rejected: แสดง "กรุณาแก้ไขรีวิว" พร้อมเหตุผลจากแอดมิน และอนุญาตให้แก้ไขส่งใหม่
- แสดงการ์ด "ส่วนลดพร้อมใช้" เมื่อมียอดคงเหลือ > 0 หรือมีรีวิว pending

#### Public Review UX

- หน้า `/reviews`: แสดงรีวิวที่ approved เท่านั้น
- Header: "รีวิวจากลูกค้า" / "ซื้อจริง · ส่งจริง · ตรวจสอบได้"
- สรุป: คะแนนเฉลี่ย, จำนวนรีวิว, การกระจายคะแนน (calculated from real data)
- ตัวกรอง: ทั้งหมด, สินค้า, การจัดส่ง, บริการ
- Review card: ชื่อ "ผู้ซื้อที่ยืนยันแล้ว", คะแนน, หมวดหมู่, ข้อความ, วันที่, เลขที่ออเดอร์ masked, สินค้าที่ซื้อจริงจาก order_items
- ไม่แสดง: เบอร์โทร, ที่อยู่, LINE identity, payment, tracking number
- CTA: "ดูสินค้าพร้อมส่ง" / "ดูสถานะออเดอร์ของฉัน"

#### Admin Moderation UX

- หน้า `/admin/reviews`: คิวตรวจสอบรีวิว
- ตัวกรอง: รอตรวจสอบ, อนุมัติแล้ว, ปฏิเสธ, ทั้งหมด
- แต่ละรายการแสดง: เลขที่ออเดอร์ masked, ชื่อลูกค้า, วันที่ส่งถึง, สินค้าที่ซื้อ, คะแนน, ข้อความ, หมวดหมู่, สถานะ
- ปุ่ม "อนุมัติ + ฿5" สำหรับ pending: อนุมัติและออกส่วนลด atomic
- ปุ่ม "ปฏิเสธ" พร้อม required reason
- แอดมินไม่สามารถแก้ไขคะแนนหรือข้อความของลูกค้า

#### Reward Idempotency

- `approve_order_review()` ตรวจ status ก่อน action
- ถ้า approved แล้ว: return idempotent replay โดยไม่สร้าง credit ซ้ำ
- Unique constraint `customer_discount_credits.source_review_id` ป้องกัน credit ซ้ำจากรีวิวเดียวกัน

#### Exact Files Changed

Migration:
- `supabase/migrations/20260909124401_verified_order_reviews.sql`

Library:
- `src/lib/admin-permissions.ts` — เพิ่ม `reviews.moderate` permission
- `src/lib/review-service.ts` — ฟังก์ชันจัดการรีวิวและส่วนลดใหม่
- `src/lib/member-service.ts` — เพิ่ม review status และ availableCredit

API routes:
- `src/app/api/customers/orders/[orderId]/review/route.ts` — Member review submission/update
- `src/app/api/admin/reviews/route.ts` — Admin review queue
- `src/app/api/admin/reviews/[reviewId]/route.ts` — Admin moderation
- `src/app/api/reviews/route.ts` — Public reviews

Pages:
- `src/app/(public)/member/page.tsx` — Member dashboard พร้อม review status
- `src/app/(public)/member/MemberReviewForm.tsx` — Review form component
- `src/app/(public)/reviews/page.tsx` — Public review page
- `src/app/(public)/reviews/PublicReviewsList.tsx` — Review list component
- `src/app/admin/reviews/page.tsx` — Admin moderation page

UI:
- `src/components/admin/admin-sidebar.tsx` — เพิ่ม reviews menu item

Tests:
- `scripts/verify-review-system.mjs` — Automated verification
- `package.json` — เพิ่ม `test:review-system` script

#### Tests Run

- `npm run test:review-system`: PASS (22 tests)
- `npm run test:line-copy`: PASS
- `npm run test:payment-guards`: PASS
- `npm run test:shipping-policy`: PASS
- `npm run build`: PASS
- `git diff --check`: PASS

Database transaction tests ที่ต้องใช้ Codex/Supabase MCP:
- ลูกค้ารีวิวออเดอร์คนอื่นไม่ได้
- ออเดอร์ non-delivered รีวิวไม่ได้
- ออเดอร์หนึ่งรีวิวได้หนึ่งครั้ง
- คะแนนนอก 1–5 ถูก reject
- การอนุมัติสร้าง credit ฿5 เพียงหนึ่งรายการ
- การอนุมัติซ้ำไม่สร้าง credit เพิ่ม
- การปฏิเสธไม่สร้าง credit

#### Remaining Batch 10B Work

- การใช้ส่วนลด: หักจากยอดออเดอร์ใหม่โดยอัตโนมัติ
- Credit reservation: จอง credit เมื่อสร้างออเดอร์ใหม่
- Credit redemption: ตัด credit เมื่อออเดอร์ confirmed
- Credit void: ยกเลิก credit ที่ reserved เมื่อออเดอร์ cancelled
- หน้าชำระเงิน: แสดงยอดหักส่วนลด

#### Explicit Confirmations

- **Migration ไม่ถูก apply ไปยัง remote database**: Migration สร้างไว้ใน local repository เท่านั้น รอ Codex ตรวจสอบและ apply
- **Production ไม่ถูก deploy**: งานนี้เป็น local implementation เท่านั้น รอ Codex audit และ deploy
- **ไม่มี fake reviews หรือ fake product images**: ระบบสร้างขึ้นเพื่อแสดงรีวิวจากลูกค้าจริงเท่านั้น หน้า public reviews จะแสดง empty state เมื่อยังไม่มี approved reviews
- **Customer-facing Thai copy ใช้เสียงผู้หญิงค่ะ/นะคะ**: ผ่านการตรวจสอบด้วย `npm run test:line-copy`

---

### Batch 10A Repair (2026-09-09)

#### Issues Found by Codex Audit

1. **Fake reviews on homepage** — `TestimonialsNavy.tsx` มี fake testimonials (สมชาย, สมหญิง, วิไล)
2. **Fake metrics on social proof** — `SocialProofNavy.tsx` แสดงตัวเลขปลอม (10,000+, 4.9 rating, 500+ reviews)
3. **Invalid approve button** — หน้า admin reviews แสดงปุ่ม "อนุมัติซ้ำ" สำหรับรีวิวที่ rejected แล้ว
4. **Missing refresh after submission** — Member review form ไม่เรียก `router.refresh()` หลังส่งรีวิว
5. **Wrong Postgres error codes** — `review-service.ts` ใช้ P0001 แทน P0002 สำหรับ not_found errors
6. **Admin review counts incorrect** — หน้า admin reviews คำนวณ counts จาก filtered data ทำให้ status cards อื่นแสดง 0

#### Repairs Applied

##### 1. Remove Fake Reviews from Homepage

**File:** `src/components/TestimonialsNavy.tsx`

**Before:**
- แสดง fake testimonials array พร้อมชื่อลูกค้าปลอม
- มี hardcoded reviews (ดีมากค่ะ, ส่งไวมาก, etc.)

**After:**
- ลบ testimonials array ออกทั้งหมด
- แสดง empty state พร้อม link ไป `/reviews`
- ข้อความ: "ยังไม่มีรีวิวจากลูกค้า" / "ดูรีวิวจากลูกค้าจริง"

##### 2. Remove Fake Metrics from Social Proof

**File:** `src/components/SocialProofNavy.tsx`

**Before:**
```tsx
const stats = [
  { value: "10,000+", label: "ลูกค้าไว้วางใจ" },
  { value: "4.9", label: "คะแนนเฉลี่ย" },
  { value: "500+", label: "รีวิวจากลูกค้า" },
];
```

**After:**
```tsx
const benefits = [
  { icon: Package, label: "สินค้าพร้อมส่ง", description: "สต็อกจริง ตรวจสอบได้" },
  { icon: Users, label: "สมาชิกฟรี", description: "สมัครง่าย ใช้เลย" },
  { icon: Shield, label: "สินค้าแท้ 100%", description: "รับประกันคุณภาพ" },
  { icon: Sparkles, label: "สินค้าหลากหลาย", description: "หลายแบรนด์ หลายรุ่น" },
];
```

##### 3. Remove "อนุมัติซ้ำ" Button for Rejected Reviews

**File:** `src/app/admin/reviews/page.tsx`

**Before:**
- แสดงปุ่ม "อนุมัติ" สำหรับทุก status

**After:**
```tsx
{review.status === "rejected" && (
  <div className="...">
    <p>รอลูกค้าแก้ไขและส่งรีวิวใหม่</p>
    <p>ลูกค้าจะเห็นเหตุผลการปฏิเสธและสามารถแก้ไขรีวิวได้...</p>
  </div>
)}
```

##### 4. Add router.refresh() After Member Review Submission

**File:** `src/app/(public)/member/MemberReviewForm.tsx`

**Before:**
```tsx
// No router import
// No refresh after submission
```

**After:**
```tsx
import { useRouter } from "next/navigation";

export default function MemberReviewForm(...) {
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent) => {
    // ... submission logic
    setSuccess(result.message);
    setIsOpen(false);
    router.refresh(); // ← Added
  };
}
```

**Note:** ลบ `onSubmit` prop ออกเนื่องจากไม่จำเป็นแล้ว (component จัดการ refresh เอง)

##### 5. Fix Postgres Error Code Mapping

**File:** `src/lib/review-service.ts`

**Before:**
```typescript
if (error.code === "P0001") throw new Error("review_not_found");
```

**After:**
```typescript
// P0002 is "no_data_found" - used for not found errors
if (error.code === "P0002") throw new Error("review_not_found");
// 42501 is "insufficient_privilege" - used for authorization errors
if (error.code === "42501") throw new Error("not_authorized");
// 22023 is "invalid_parameter_value" - used for validation errors
if (error.code === "22023") throw new Error("invalid_input");
// 55000 is "object_not_in_prerequisite_state" - used for business rule violations
if (error.code === "55000") throw new Error(error.message);
```

**Affected functions:**
- `submitOrderReview()` — order_not_found, not_authorized, invalid_input
- `updateRejectedReview()` — review_not_found, not_authorized
- `approveOrderReview()` — review_not_found
- `rejectOrderReview()` — review_not_found, invalid_input

##### 6. Fix Admin Review Counts API

**File:** `src/lib/review-service.ts`

**Before:**
```typescript
export async function getAdminReviewQueue(
  status: ReviewStatus | "all",
  page: number,
  pageSize: number,
): Promise<{ reviews: ReviewWithOrder[]; total: number }> {
  // ... only returned filtered/paginated results
}
```

**After:**
```typescript
export async function getAdminReviewQueue(
  status: ReviewStatus | "all",
  page: number,
  pageSize: number,
): Promise<{
  reviews: ReviewWithOrder[];
  total: number;
  counts: { pending: number; approved: number; rejected: number; all: number };
}> {
  // Get counts for all statuses (independent from filter)
  const { data: allReviews, error: countError } = await client
    .from("order_reviews")
    .select("status");

  const counts = {
    pending: allReviews?.filter(r => r.status === "pending").length ?? 0,
    approved: allReviews?.filter(r => r.status === "approved").length ?? 0,
    rejected: allReviews?.filter(r => r.status === "rejected").length ?? 0,
    all: allReviews?.length ?? 0,
  };

  // ... get paginated/filtered reviews

  return { reviews: result, total: count ?? 0, counts };
}
```

**File:** `src/app/api/admin/reviews/route.ts`

**Before:**
```typescript
return NextResponse.json({
  reviews: result.reviews,
  total: result.total,
  page,
  pageSize,
  session: publicAdminSession(session),
});
```

**After:**
```typescript
return NextResponse.json({
  reviews: result.reviews,
  total: result.total,
  counts: result.counts, // ← Added
  page,
  pageSize,
  session: publicAdminSession(session),
});
```

**File:** `src/app/admin/reviews/page.tsx`

**Before:**
```tsx
const counts = useMemo(() => ({
  pending: reviews.filter((review) => review.status === "pending").length,
  approved: reviews.filter((review) => review.status === "approved").length,
  rejected: reviews.filter((review) => review.status === "rejected").length,
  all: reviews.length,
}), [reviews]);
```

**After:**
```tsx
const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0, all: 0 });

const loadReviews = useCallback(async () => {
  // ...
  setReviews(result.reviews ?? []);
  setCounts(result.counts ?? { pending: 0, approved: 0, rejected: 0, all: 0 });
}, [filter]);
```

#### Regression Tests Added

**File:** `scripts/verify-review-system.mjs`

Added 11 new tests:
1. `TestimonialsNavy does not contain fake reviews`
2. `TestimonialsNavy uses empty state or placeholder`
3. `SocialProofNavy does not contain fake metrics`
4. `SocialProofNavy uses neutral benefits instead of metrics`
5. `Review service uses correct Postgres error codes`
6. `Review service handles all error codes correctly`
7. `MemberReviewForm calls router.refresh() after submission`
8. `getAdminReviewQueue returns counts object`
9. `Admin reviews API returns counts in response`
10. `Admin reviews page uses API counts instead of calculating from filtered data`
11. `Admin reviews page does not show approve button for rejected reviews`

#### Verification Results

- `npm run test:review-system`: PASS (31 tests total, 11 new regression tests)
- `npm run build`: PASS
- `git diff --check`: PASS

#### Files Modified

**UI Components:**
- `src/components/TestimonialsNavy.tsx` — Removed fake reviews, added empty state
- `src/components/SocialProofNavy.tsx` — Removed fake metrics, added neutral benefits

**Library:**
- `src/lib/review-service.ts` — Fixed error codes, added counts to admin queue

**Admin:**
- `src/app/admin/reviews/page.tsx` — Removed approve button for rejected, use API counts

**Member:**
- `src/app/(public)/member/MemberReviewForm.tsx` — Added router.refresh()

**API:**
- `src/app/api/admin/reviews/route.ts` — Added counts to response

**Tests:**
- `scripts/verify-review-system.mjs` — Added 11 regression tests

#### Final Confirmations

- ✅ **No remote migration applied** — Migration ยังไม่ถูก apply ไปยัง production database
- ✅ **No deployment** — งานนี้เป็น local repair เท่านั้น
- ✅ **No fake reviews** — ลบ fake testimonials และ fake metrics ออกจาก homepage แล้ว
- ✅ **Batch 10B not started** — ยังไม่เริ่มงาน Batch 10B (credit usage)

---

### Batch 10A Final Repair (2026-09-09)

#### Additional Issues Found

1. **Admin reviews page missing "ทั้งหมด" filter** — Queue cards only showed pending/approved/rejected, missing total count
2. **Admin reviews page not responsive** — Used grid-cols-3 which doesn't adapt well to mobile
3. **Admin API pagination unsafe** — `page=abc`, zero, negative, decimal, or invalid values could pass NaN to database
4. **Review service inefficient count query** — Fetched all review rows just to calculate status counts
5. **MemberReviewForm UX incomplete** — Success message hidden in closed modal, didn't prevent duplicate submission

#### Final Repairs Applied

##### 1. Add "ทั้งหมด" Filter to Admin Reviews

**File:** `src/app/admin/reviews/page.tsx`

**Before:**
- Only 3 queue cards: รอตรวจสอบ, อนุมัติแล้ว, ปฏิเสธ

**After:**
```tsx
import { Layers } from "lucide-react";

<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
  <QueueCard icon={Clock} label="รอตรวจสอบ" count={counts.pending} active={filter === "pending"} onClick={() => setFilter("pending")} />
  <QueueCard icon={CheckCircle} label="อนุมัติแล้ว" count={counts.approved} active={filter === "approved"} onClick={() => setFilter("approved")} />
  <QueueCard icon={XCircle} label="ปฏิเสธ" count={counts.rejected} active={filter === "rejected"} onClick={() => setFilter("rejected")} />
  <QueueCard icon={Layers} label="ทั้งหมด" count={counts.all} active={filter === "all"} onClick={() => setFilter("all")} />
</div>
```

##### 2. Make Admin Reviews Page Responsive

**File:** `src/app/admin/reviews/page.tsx`

**Before:**
```tsx
<div className="grid grid-cols-3 gap-3">
```

**After:**
```tsx
<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
```

**Result:**
- Mobile: 2-column layout (2 cards per row)
- Desktop (sm:): 4-column layout (4 cards per row)

##### 3. Fix Admin API Pagination Parsing

**File:** `src/app/api/admin/reviews/route.ts`

**Before:**
```typescript
const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("page_size") ?? "20", 10)));
```

**After:**
```typescript
// Parse page with validation: default to 1 for invalid values
const pageParam = searchParams.get("page");
let page = 1;
if (pageParam !== null) {
  const parsed = parseInt(pageParam, 10);
  // Must be a positive integer
  if (!Number.isNaN(parsed) && parsed > 0 && Number.isInteger(parsed)) {
    page = parsed;
  }
}

// Parse pageSize with validation: default to 20, max 100
const pageSizeParam = searchParams.get("page_size");
let pageSize = 20;
if (pageSizeParam !== null) {
  const parsed = parseInt(pageSizeParam, 10);
  // Must be a positive integer
  if (!Number.isNaN(parsed) && parsed > 0 && Number.isInteger(parsed)) {
    pageSize = Math.min(100, parsed);
  }
}
```

**Handles:**
- `page=abc` → defaults to 1
- `page=0` → defaults to 1
- `page=-5` → defaults to 1
- `page=1.5` → defaults to 1
- `page_size=abc` → defaults to 20
- `page_size=200` → capped at 100
- Never passes NaN to database

##### 4. Optimize Review Service Count Query

**File:** `src/lib/review-service.ts`

**Before:**
```typescript
// Get counts for all statuses (independent from filter)
const { data: allReviews, error: countError } = await client
  .from("order_reviews")
  .select("status");

if (countError) throw countError;

const counts = {
  pending: allReviews?.filter(r => r.status === "pending").length ?? 0,
  approved: allReviews?.filter(r => r.status === "approved").length ?? 0,
  rejected: allReviews?.filter(r => r.status === "rejected").length ?? 0,
  all: allReviews?.length ?? 0,
};
```

**After:**
```typescript
// Get counts for all statuses in parallel using count queries (no data fetch)
const [pendingCount, approvedCount, rejectedCount, allCount] = await Promise.all([
  client.from("order_reviews").select("*", { count: "exact", head: true }).eq("status", "pending"),
  client.from("order_reviews").select("*", { count: "exact", head: true }).eq("status", "approved"),
  client.from("order_reviews").select("*", { count: "exact", head: true }).eq("status", "rejected"),
  client.from("order_reviews").select("*", { count: "exact", head: true }),
]);

const counts = {
  pending: pendingCount.count ?? 0,
  approved: approvedCount.count ?? 0,
  rejected: rejectedCount.count ?? 0,
  all: allCount.count ?? 0,
};
```

**Benefits:**
- No data transfer (uses `head: true`)
- Parallel execution (4 queries run simultaneously)
- Returns only count metadata

##### 5. Improve MemberReviewForm UX

**File:** `src/app/(public)/member/MemberReviewForm.tsx`

**Before:**
- Success message shown inside modal
- Modal closed immediately after submission
- No immediate visual feedback
- Could submit multiple times

**After:**
```tsx
const [justSubmitted, setJustSubmitted] = useState(false);

const showPendingStatus = justSubmitted || existingReview?.status === "pending";

const handleSubmit = async (event: React.FormEvent) => {
  // ... submission logic
  setIsOpen(false); // Close modal
  setJustSubmitted(true); // Show pending status immediately
  router.refresh(); // Refresh dashboard
};

return (
  <>
    {showPendingStatus && (
      <div className="...">
        <Loader2 className="h-4 w-4 animate-spin text-sky-300" />
        <span>ส่งรีวิวแล้ว · รอตรวจสอบ</span>
      </div>
    )}
    
    {!existingReview && !justSubmitted && (
      <button onClick={() => setIsOpen(true)}>
        รีวิวเพื่อรับส่วนลด ฿5
      </button>
    )}
  </>
);
```

**Improvements:**
- ✅ Immediately hides CTA button after successful submission
- ✅ Shows "ส่งรีวิวแล้ว · รอตรวจสอบ" outside modal
- ✅ Prevents duplicate submission (button hidden after submit)
- ✅ Calls `router.refresh()` to update dashboard
- ✅ Success message visible, not hidden in closed modal

#### Regression Tests Added (Final)

**File:** `scripts/verify-review-system.mjs`

Added 5 new tests:
1. `Admin reviews page has ทั้งหมด filter card`
2. `Admin reviews page uses responsive grid layout`
3. `Admin reviews API safely handles invalid pagination`
4. `Review service uses parallel count queries`
5. `MemberReviewForm shows pending status after submission`

#### Verification Results (Final)

- `npm run test:review-system`: PASS (41 tests total, 19 regression tests)
- `npm run test:line-copy`: PASS
- `npm run test:payment-guards`: PASS
- `npm run test:shipping-policy`: PASS
- `npm run build`: PASS
- `git diff --check`: PASS

#### Files Modified (Final)

**UI Components:**
- `src/app/admin/reviews/page.tsx` — Added "ทั้งหมด" filter, responsive grid

**Library:**
- `src/lib/review-service.ts` — Optimized count queries with parallel execution, error checking
- `src/lib/pagination-helpers.ts` — New helper for safe pagination validation

**Member:**
- `src/app/(public)/member/MemberReviewForm.tsx` — Improved UX, prevent duplicate submission

**API:**
- `src/app/api/admin/reviews/route.ts` — Uses pagination helper

**Tests:**
- `scripts/verify-review-system.mjs` — Added 3 more regression tests (total 19)

#### Final Confirmations

- ✅ **No remote migration applied** — Migration `20260909124401_verified_order_reviews.sql` is local only
- ✅ **No deployment** — All changes are local only
- ✅ **No real data modified** — Only code changes, no database writes
- ✅ **Batch 10B not started** — Credit usage work remains pending

---

## Batch 10A Production Verification and Batch 10B — Review Credit Order Integration

**Updated:** 9 September 2026 (Asia/Bangkok)  
**Status:** ✅ Database applied and verified · ✅ Application build passed · ✅ Production deployed and browser verified

> This section supersedes the earlier local-only confirmations above. Supabase MCP became available after that checkpoint.

### Batch 10A Production Result

- Full rollback-only database verification passed.
- Applied `verified_order_reviews` to Supabase project `puslxgriozubqlpoxrqo`.
- Remote migration version: `20260909160757`.
- Confirmed both review tables, RLS, and service-role-only function access.
- No synthetic test data remains.

### Batch 10B Implementation

**Migration:** `supabase/migrations/20260909161121_apply_review_credit_to_orders.sql`  
**Remote migration version:** `20260909161908`

1. The next submitted order automatically reserves at most one oldest available credit.
2. Final total is `subtotal + shipping_fee - discount_amount`.
3. Cancelling or expiring an unpaid order releases its credit.
4. Confirming payment redeems the credit.
5. Row locks, `SKIP LOCKED`, unique indexes, and constraints prevent double use.
6. Credit functions are executable by `service_role` only.
7. Member UI, admin UI, draft API, and LINE payment summary show the discount.

### Database Verification

- Exact Batch 10B migration inside `BEGIN ... ROLLBACK`: PASS.
- Synthetic reserve → cancel → release: PASS.
- Synthetic reserve → pending → confirmed → redeem: PASS.
- Post-apply reserve/release rollback smoke test: PASS.
- `anon` and `authenticated` cannot reserve credits; `service_role` can.
- No real order, customer, payment, or stock row was modified.

### Application Verification

- `npm run test:review-credit`: PASS
- `npm run test:review-system`: PASS (41 tests; 2 documented build/lint skips)
- `npm run test:line-copy`: PASS
- `npm run test:payment-guards`: PASS
- `npm run test:shipping-policy`: PASS
- `npm run build`: PASS (52 routes)
- `git diff --check`: PASS

### Supabase Advisor Review

- No new missing-foreign-key-index warning remains for review-credit order links.
- Review tables intentionally have RLS without client policies because access uses server-side service-role APIs.
- Existing warning remains: leaked-password protection is disabled in Supabase Auth.
- Unused-index notices are informational immediately after deployment.

### Production Deployment and Browser Verification

- Vercel deployment: `dpl_2yrrGbqDfvSETuCQnRHJqMcjsRdL`
- Production alias: `https://www.pod4u.store`
- `/reviews`: PASS — review filters, empty state, ฿5 promotion, and links load correctly.
- `/member`: PASS — web login form and member entry links load correctly.
- `/admin/reviews`: PASS — authenticated page loads all four queues and moderation policy.
- `/admin/orders`: PASS — authenticated queue loads workflow labels, totals, and detail links.
- Existing real orders were viewed read-only; no production order or stock status was changed.

### Files Added or Updated

- `supabase/migrations/20260909161121_apply_review_credit_to_orders.sql`
- `scripts/verify-review-credit.mjs`
- `package.json`
- `src/lib/order-service.ts`
- `src/lib/member-service.ts`
- `src/lib/order-payment-service.ts`
- `src/app/(public)/member/page.tsx`
- `src/app/admin/orders/page.tsx`
- `src/app/admin/orders/[orderId]/page.tsx`
- `src/app/api/customers/orders/[orderId]/route.ts`

### Full Production E2E Verification — 10 September 2026

Executed the complete review reward lifecycle against the production Supabase schema inside one transaction ending with `ROLLBACK`:

1. Created an isolated synthetic customer and delivered order.
2. Submitted a 5-star review and confirmed duplicate submission returned an idempotent replay.
3. Approved the review and confirmed exactly one ฿5 credit was issued.
4. Repeated approval and confirmed no duplicate credit was created.
5. Created the next order and confirmed the credit was reserved automatically and the total changed from ฿100 to ฿95.
6. Cancelled the order and confirmed the total returned to ฿100 and the credit became available again.
7. Created another order, moved it through pending → confirmed, and confirmed the credit became redeemed with a final total of ฿95.
8. Confirmed the approved review was eligible for public display.
9. Rolled back the transaction and verified zero synthetic customers, orders, reviews, or credits remained.

**Result:** ✅ PASS — full review → approval → reward → automatic discount → release/redeem lifecycle verified without modifying real orders or stock.
## Review Discovery and LINE Rich Menu Update — 2026-09-10

> This section supersedes earlier review-eligibility and public-review copy in the historical Batch 10 sections.

### Review eligibility

- Members may submit one review immediately after a non-cancelled order is created; delivery is no longer required.
- Reviews may cover the ordering experience, system usability, service, product, delivery, or the overall experience.
- Cancelled orders cannot be reviewed.
- The ฿5 credit is still issued only after admin approval and remains limited to one credit per review/order.

### Public reviews

- `/reviews` is public and displays approved reviews only.
- Customer names and order numbers are masked.
- Trust badges reflect the real order stage instead of claiming every reviewer has received the product.
- Discoverable links were added to desktop/mobile navigation, the homepage review section, Footer, Member, and sitemap.
- Production responsive browser verification passed at mobile and desktop sizes with no console errors.

### LINE Rich Menu v3

- Replaced the lower-left `วิธีสั่งซื้อ` tile with `รีวิวลูกค้า`.
- The review tile opens `https://www.pod4u.store/reviews?source=line-rich-menu`.
- Kept `สั่งซื้อสินค้า`, `สมัคร/เชื่อมสมาชิก`, `เช็กสถานะออเดอร์`, `ติดต่อแอดมิน`, and `LINE สำรอง`.
- LINE validation passed and the new default menu was published as `richmenu-193128f111e9a5f78fce84433ea661d6`.
- Previous rich menus were preserved for rollback.

## LINE Customer-Service Automation — 2026-09-10

**Status:** ✅ Implemented · ✅ Tests and LINE payload validation passed · ✅ Production deployed

### Implemented behavior

- New followers and customers who send a greeting receive a Pod4U Flex Message explaining the three-step ordering flow.
- The guide links directly to live ready-stock and starts the one-time member connection flow.
- Repetitive intents are routed automatically: product availability, ordering help, membership, order status, shipping fee, dispatch schedule, opening hours, payment, tracking, cancellation, and admin handoff.
- Product questions such as `มาโบมีรสสตอเหลือไหม` are separated from order commands and searched against the live catalog.
- Catalog matching now considers brand names, flavor names, combined names, and configured aliases instead of aliases alone.
- Availability replies show only current database results and provide a direct link to the full live-stock page.
- Unknown conversation is left unanswered for an admin instead of sending a repetitive generic fallback.
- No order is created and no stock is reserved or deducted from an availability question.

### Verification

- `npm run test:line-automation`: PASS (14 intent cases plus Flex structure checks)
- `npm run test:line-copy`: PASS
- `npm run test:shipping-policy`: PASS
- `npx tsc --noEmit`: PASS
- `npm run build`: PASS (52 routes)
- LINE Messaging API reply-message validation: PASS (`200`)
- Supabase catalog read-only smoke query: PASS
- Production signed-webhook smoke test: PASS (`200`)
- `git diff --check`: PASS

### Production deployment

- Vercel deployment: `dpl_8KvwYmoJ1JTajSi1mrtR6EXbxSCc`
- Production alias: `https://www.pod4u.store`

### Files added or updated

- `src/lib/line-automation.ts`
- `src/lib/fuzzy-search.ts`
- `src/app/api/line/webhook/route.ts`
- `scripts/verify-line-automation.mjs`
- `package.json`

## LINE Sales-Conversation Automation — 2026-09-10

**Status:** ✅ Production deployed

### Sales behavior

- Every automated answer now follows the same sales pattern: answer the question accurately, explain the relevant customer convenience, and end with a natural question plus an action button.
- The webhook reads the actual LINE-to-member link and default-address availability before drafting sales copy.
- Linked members with a saved address are told that they do not need to type personal or delivery data again.
- Linked members without a default address are directed to add it before order confirmation.
- Unlinked users are invited to connect once, with the explicit benefit that the store remembers their details, orders, and tracking status.
- Product availability answers only cite live catalog matches. If no match exists, the reply offers a live-stock link and asks whether the customer would like an alternative.
- Product-order suggestions do not offer a direct order postback to an unlinked LINE identity; they guide the customer to link first.
- Shipping, dispatch, payment, tracking, cancellation, order status, prices, and general stock replies all include a contextual CTA.

### Verification

- `npm run test:line-automation`: PASS (14 intent and conversation-CTA checks)
- `npm run test:line-copy`: PASS
- `npm run test:shipping-policy`: PASS
- `npx tsc --noEmit`: PASS
- `npm run build`: PASS (52 routes)
- Supabase sales-context lookup: PASS (read-only)
- LINE Flex Message validation: PASS (`200`)
- Production signed webhook smoke test: PASS (`200`)

### Production deployment

- Vercel deployment: `dpl_4okdbSA9e9zy7CNXjfe9w49Ashqr`
- Production alias: `https://www.pod4u.store`

## MARBO / M BAR Product Clarification — 2026-09-10

**Status:** ✅ Production deployed

- A broad customer question such as `มาโบมีอะไรเหลือ` now opens a clear product choice instead of assuming the customer means a replacement head.
- The reply separates `MARBO M SWITCH 15K` (replacement head) from `M BAR 10K` (disposable), lists current available flavours from the live catalog, and ends with two quick-reply choices.
- A specific query, such as `มาโบ องุ่นมีไหม`, remains a live catalog search rather than being replaced by the category chooser.
- Verification passed: `npm run test:line-automation` (19 cases), `npm run test:line-copy`, `npm run test:shipping-policy`, `npx tsc --noEmit`, `npm run build`, and `git diff --check`.
- Vercel deployment: `dpl_ERNSeKRtZTsaGPUfc1ffTtAhxL8z` → `https://www.pod4u.store`

## LINE Rich Menu Membership Label Repair — 2026-09-10

**Status:** ✅ Published and verified as LINE OA default

- Root cause: Rich Menu v3 was the live default, but its uploaded artwork and action label still said `สมัคร/เชื่อมสมาชิก`.
- Changed both the visible artwork and action label to `เข้าสู่ระบบสมาชิก`; the LIFF destination remains unchanged.
- LINE validation passed and the corrected menu was published as `richmenu-fccdde8d7bace4611a8bdaa6ced50618`.
- LINE default-menu API verification returned the same menu ID and confirmed the membership action label and LIFF URI.
- Previous menus remain available for rollback.

## LINE Rich Menu v4 Visual Refresh — 2026-09-10

**Status:** ✅ Published as LINE OA default

- Increased the menu icons, Thai action labels, and supporting text for easier reading on mobile.
- Kept the primary shopping action visually dominant and retained all six existing destinations.
- Replaced English subtitles with concise Thai guidance and added functional accent colors for member, status, reviews, admin, and backup LINE actions.
- LINE JSON validation and image-size validation passed; JPEG delivery asset is 2500 × 843 and below the LINE upload limit.
- Published default Rich Menu: `richmenu-5db787a9eae0daa8d45b9133b9816a93`.

## LINE Rich Menu Visual Redesign v4 — 2026-09-10

**Status:** ✅ Published and verified as LINE OA default

- Redesigned the six-button menu with clearer hierarchy, stronger color coding, Thai helper text, and a prominent `เริ่มตรงนี้` shopping action.
- Kept all existing destinations and business actions unchanged.
- Published optimized 2500×843 JPEG artwork after LINE rejected the larger PNG with HTTP 413.
- LINE validation passed and `richmenu-056df8ffdf690324d8564322e66dcdd9` was verified as the selected default menu with six action areas.
- Previous rich menus remain available for rollback.

## LIFF Member Login Performance Repair — 2026-09-10

**Status:** ✅ Production deployed

- Production logs showed that successful LIFF login triggered two consecutive `/member` renders because the client called both `router.replace()` and `router.refresh()`.
- Removed the redundant refresh so a successful LINE member login performs one navigation.
- Parallelized the order-items, review-status, and available-credit reads after the initial member lookup instead of waiting for three sequential Supabase round trips.
- `npx tsc --noEmit`, `npm run build`, and `git diff --check` passed.
- Vercel deployment: `dpl_2wNqev4ahUmED4dDvNmWBHETZoNC` → `https://www.pod4u.store`

## LINE Rich Menu v6 — Tall Product Menu — 2026-09-10

**Status:** ✅ Published and verified as LINE OA default

- Replaced the short 2500×843 layout with the tall 2500×1686 LINE rich-menu format for larger mobile tap targets.
- Uses a restrained Pod/navy-first palette with acid-lime reserved for actions and emphasis.
- The primary shopping area occupies the full top row and uses three unchanged catalog images from ALFA, M BAR, and MARBO M SWITCH.
- Six rectangular action areas cover all 4,215,000 pixels with zero gaps and zero overlaps.
- LINE Rich Menu validation passed; the uploaded JPEG is 2500×1686 and 542,745 bytes.
- Published and verified default Rich Menu: `richmenu-a272de2664ebf70d070ab7629196d5f7`.
- Previous Rich Menus remain available for rollback.

## Rich Menu Order-Status LIFF Routing Repair — 2026-09-10

**Status:** ✅ Production deployed

- Root cause: the LIFF client read `next=orders` before `liff.init()` completed. LINE temporarily carries additional LIFF URL information in `liff.state`, so the early read fell back to the member home destination.
- The destination is now resolved only after `liff.init()` and also safely recognizes the `liff.state` form without modifying LINE-owned parameters.
- Linked members who tap “เช็กสถานะออเดอร์” now continue to `/member#orders`; unlinked users still enter the existing first-time registration flow.
- `npm run test:member-liff`, `npx tsc --noEmit`, and `npm run build` passed.
- Production smoke request to `/member/liff?next=orders`: HTTP 200.
- Vercel deployment: `dpl_BpCN4UoHj1vsV75Xm2EhGcBUu7W5` → `https://www.pod4u.store`.

## First-Follow Member Button Repair — 2026-09-10

**Status:** ✅ Production deployed

- Root cause: the welcome Flex card used a `postback` action with `displayText`, so tapping “เข้าสู่ระบบสมาชิก” inserted text into the chat and depended on a second webhook response.
- Replaced that action with a direct LIFF `uri` action. New customers now open the one-time registration flow, while existing linked customers continue through the same LIFF member session flow.
- Added an automated assertion that the welcome member button is a LIFF URL and has no `displayText` fallback.
- `npm run test:line-automation`, `npm run test:line-copy`, `npx tsc --noEmit`, and `npm run build` passed.
- LINE Messaging API Flex validation passed with HTTP 200.
- Vercel deployment: `dpl_4pL7eQ9XuopZAB4oMe9Y8NAm1zVD` → `https://www.pod4u.store`.

## Member LIFF Redirect and Loading Audit — 2026-09-10

**Status:** ✅ Verified and optimized

- Audited both live Rich Menu destinations: `เข้าสู่ระบบสมาชิก` and `เช็กสถานะออเดอร์`.
- Production logs showed one unique `POST /api/customers/liff-session` for the inspected member entry; no repeated account-link request or application redirect loop was found.
- The application performs one final client navigation after LINE identity verification. LINE may still perform its documented LIFF primary/secondary redirect when preserving `next=orders`; that redirect is required for LIFF authentication and destination restoration.
- Removed the storefront header, cart provider, welcome popup, footer, and floating LINE button from the `/member/liff` and `/member/access` transition pages. These pages now render only the authentication hand-off UI, avoiding unrelated component work and link prefetching while LINE verifies the member.
- Replaced the remaining unlinked-customer membership quick reply with a direct LIFF URI. It no longer posts `membership_start` to the webhook and waits for a second message before opening the member flow.
- Destination checks still pass for direct `next=orders`, encoded `liff.state`, invalid external destinations, and the default member-home path.
- `npm run test:member-liff`, `npm run test:line-automation`, `npm run test:line-copy`, `npx tsc --noEmit`, and `npm run build` passed.
- Vercel deployment: `dpl_BB9wQP8cTRMK7VJAVc51tEDBt8pp` → `https://www.pod4u.store`.

## Context-aware LINE Greeting Repair — 2026-09-10

**Status:** ✅ Implemented and verified

- The full three-step onboarding Flex card is now reserved for the LINE `follow` event, so customers see it when they first add the OA but do not receive the same large card every time they say hello.
- A greeting now returns a compact response selected from three states: new/unlinked customer, linked member missing a delivery address, or linked member ready to order.
- Each state ends with two relevant direct actions. New customers get stock and member-login links; ready members get stock and order-status links; members missing an address get stock and member-profile links.
- No chat-body content is stored in Supabase. The existing verified LINE identity and default-address presence are the only customer state read for the response.
- Automated checks assert that all greeting variants are text messages, have two actions, differ by membership state, and use direct LIFF URIs.
- LINE Messaging API validation passed for all three membership-state replies.
- `npm run test:line-automation`, `npm run test:line-copy`, `npx tsc --noEmit`, and `npm run build` passed.
- Vercel deployment: `dpl_7vpM89M6up7aXeCbi519n6b3Z8u3` → `https://www.pod4u.store`.

## LINE Product-Image / Payment-Slip Classification Repair — 2026-09-10

**Status:** ✅ Implemented and verified

- Root cause: every incoming LINE image was sent through the payment-slip workflow. Product-reference photos from customers with no active payment therefore produced repeated, unrelated member/payment replies.
- An image is now eligible for Thunder verification only when its verified LINE identity has an active, unexpired payment request in `awaiting_slip` state.
- Images from unlinked customers or customers without an active payment are silently handed off to the LINE OA admin. The bot does not claim that an unknown product is sold, does not repeat a membership warning, and does not send the image to Thunder.
- Real payment-slip errors still receive actionable replies, including QR-not-found, amount mismatch, receiver mismatch, duplicate slip, and verification-service failures.
- Automated tests passed for both non-payment hand-off codes and payment-validation codes; customer-facing copy, TypeScript, and the clean 52-route production build also passed.
- A signed production smoke event containing an image, an unlinked LINE identity, and no active payment returned HTTP 200 without entering the payment-verification response path.
- Vercel deployment: `dpl_9BkoKJDwsebNcGA62SR8auyN7wXD` → `https://www.pod4u.store`.

## Deferred Roadmap: LINE Product-Image Recognition — 2026-09-10

**Status:** ⏸ Deferred until customer image volume justifies the additional API and operational cost

- The proposed vision workflow, response rules, provider abstraction, cost controls, implementation triggers, and acceptance criteria are recorded in `docs/future-line-image-product-recognition.md`.
- No AI image-recognition provider or new credential was added in this batch.
- The current safe image hand-off and payment-slip behavior remains unchanged.

## Warehouse Portal MVP — 2026-09-10

**Status:** ✅ Production deployed and browser verified

- Added a dedicated `/warehouse` portal and `/warehouse/login`; neither page is part of the Admin navigation or Admin session.
- Added a separate server-only warehouse account configuration and signed `warehouse_session` cookie with a 12-hour lifetime.
- Warehouse pages and APIs are protected independently in middleware. Admin credentials do not grant warehouse access, and warehouse credentials do not grant Admin access.
- Only paid/confirmed orders enter the warehouse queue. Draft, unpaid, failed-payment, and cancelled orders are not presented as packable work.
- Added the workflow `ready_to_pack → packing → packed → shipped`, plus a blocking `problem` state and controlled resume action.
- Shipment is allowed only after packing. It reuses the canonical atomic order shipment function, updates Member tracking, and sends the LINE shipment message only on the first successful transition.
- Warehouse UI exposes only packing and delivery data: order number, recipient, phone, address, SKU, product/flavour, quantity, carrier, and tracking number. It does not expose payment slips, bank details, discounts, reviews, customer history, stock administration, or settings.
- Added row locking and idempotent transitions to prevent two devices from advancing the same job incorrectly.
- Added server-side input validation, strict same-origin checks for cookie-authenticated mutations, RLS, and service-role-only database function access.

### Files added or updated

- `supabase/migrations/20260910151811_warehouse_fulfillment_portal.sql`
- `src/lib/warehouse-auth.ts`
- `src/lib/warehouse-api.ts`
- `src/lib/warehouse-service.ts`
- `src/middleware.ts`
- `src/app/api/warehouse/**`
- `src/app/warehouse/**`
- `src/components/warehouse/WarehouseHeader.tsx`
- `scripts/verify-warehouse-portal.mjs`
- `.env.example`

### Verification

- `npm run test:warehouse`: PASS (12 static security/workflow checks)
- `npx tsc --noEmit`: PASS
- `npm run build`: PASS (54 routes)
- Transaction + rollback migration test: PASS
- Production Supabase migration: APPLIED to `puslxgriozubqlpoxrqo`
- Post-apply verification: RLS enabled; `anon`/`authenticated` table access denied; function execution restricted to `service_role`; 2 existing confirmed/shipped orders backfilled.
- Supabase security advisor: no new exposed-data warning. `rls_enabled_no_policy` is expected because this is a server-only table with all client roles revoked.
- Production commit: `f813102` (`feat: add secure warehouse fulfillment portal`)
- Vercel deployment: `dpl_8M42333MgEikdih2DxaNEt9hpjQ9` → `https://www.pod4u.store`
- Production unauthenticated API check: PASS (`401`)
- Production warehouse login: PASS
- Production queue read: PASS (2 existing jobs; no order state changed)
- Production browser verification: PASS for login redirect, warehouse dashboard, status counts, order items, SKU/quantity, recipient details, and action controls.

## Public Reviews Visual Upgrade — 2026-09-11

**Status:** ✅ Implemented and ready for production deployment

- Rebuilt `/reviews` from the approved navy/lime mockup as a responsive production page.
- Added a verified-review summary, order-linked trust explanation, category filters, full-width review cards, masked customer/order identity, product context, and mobile review CTA.
- Public rating totals and review cards continue to use approved `order_reviews` records only. No sample or fabricated customer reviews are rendered in production.
- The empty state explicitly explains that reviews appear only after Admin moderation rather than displaying fake social proof.
- The review CTA links directly to the Member review section, where an eligible order can earn a ฿5 credit after approval.
- Hid the floating LINE button on `/reviews` at mobile widths because the page-level review CTA owns that fixed action area.
- `npm run test:review-system`: PASS (43 checks)
- `npm run test:review-credit`: PASS
- `npx tsc --noEmit`: PASS
- `npm run build`: PASS (55 routes)
- Browser verification: PASS at 390×844 and 1440×1000; no application console errors.
## Public Reviews Reference-Match Upgrade — 2026-09-11

- Rebuilt `/reviews` against the approved navy/lime mobile reference: dedicated Pod4U masthead, compact rating/trust panel, pill filters, verified-review cards, member review CTA, and five-item bottom navigation.
- Removed the generic storefront header, footer, and welcome popup from this focused review experience.
- Kept review integrity unchanged: only approved database reviews are rendered; no demo or fabricated customer reviews were added.
- Responsive verification: mobile 390×844 and production-safe desktop layout. TypeScript, review-system verification (43 passed), and Next.js production build passed.
- Mobile filter repair: replaced the overflowing single-row scroller with a balanced 3+2 wrapped layout, removing overlap and the visible scrollbar on narrow screens.
## Shareable Reviews Design Preview — 2026-09-11

- Added an unlisted, `noindex` online design-preview route containing 10 clearly labelled synthetic reviews for stakeholder visual review.
- The preview does not query or write Supabase, is not linked from public navigation, and cannot alter the production review feed.
- The public `/reviews` route remains restricted to approved real reviews only.
- Verified the preview at 390×844; filters and responsive review cards render correctly. TypeScript and the full Next.js production build passed.
- Added a four-hour, HTTP-only design-review cookie flow: the activation link redirects to the canonical `/reviews` URL and middleware renders the synthetic preview only for that browser. All other visitors continue to receive the real approved-review feed. A one-click exit clears the cookie.

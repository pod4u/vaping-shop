# Consent Logs Table - Supabase Setup

## 🎯 วัตถุประสงค์
เก็บ log การยอมรับ PDPA consent ของลูกค้า เพื่อเป็นหลักฐานทางกฎหมาย

---

## 📊 Table Structure

### **Table: `consent_logs`**

```sql
CREATE TABLE consent_logs (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  
  -- Consent details
  consent_type VARCHAR(50) NOT NULL, -- 'terms', 'marketing'
  accepted BOOLEAN NOT NULL DEFAULT true,
  
  -- Audit info
  ip_address VARCHAR(50),
  user_agent TEXT,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index สำหรับค้นหา
CREATE INDEX idx_consent_logs_customer ON consent_logs(customer_id);
CREATE INDEX idx_consent_logs_created ON consent_logs(created_at);
```

---

## 🔐 RLS Policy

```sql
-- Enable RLS
ALTER TABLE consent_logs ENABLE ROW LEVEL SECURITY;

-- อนุญาต service_role เท่านั้น
CREATE POLICY "Service role full access" ON consent_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

---

## 📝 Example Data

```json
{
  "id": 1,
  "customer_id": 123,
  "consent_type": "terms",
  "accepted": true,
  "ip_address": "101.109.123.456",
  "user_agent": "Mozilla/5.0...",
  "created_at": "2026-09-02T15:30:00Z"
}
```

---

## ✅ Checklist

- [ ] สร้าง table `consent_logs`
- [ ] สร้าง indexes
- [ ] เปิด RLS
- [ ] สร้าง policy สำหรับ service_role
- [ ] ทดสอบ insert ผ่าน service_role

---

**สร้างโดย:** Qwen Code
**วันที่:** 2026-09-02
**สำหรับ:** AI อีกตัวที่จะ setup table
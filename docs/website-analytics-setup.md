# Website Analytics Dashboard — ติดตั้งและส่งต่องาน

หน้าใหม่: `/admin/analytics` → เมนู **สถิติเข้าเว็บ**

ขอบเขต: สถิติการเข้าใช้งานรวม Google Search Console / Vercel และ HTTP health checks ไม่เก็บตัวตนผู้เข้าชม ไม่เชื่อมกับสมาชิกหรือออเดอร์ และไม่มีคำแนะนำการตลาดอัตโนมัติ

## สถานะงาน ณ 2026-09-10

- มีหน้า Dashboard, API อ่านสถิติ, ปุ่มซิงก์, cron วันละครั้ง และ migration ที่ deploy ขึ้น Production แล้ว
- บันทึก Production: `ANALYTICS_VERCEL_TOKEN` (Secret, จำกัด vaping-shop, หมดอายุ 2026-12-09), `ANALYTICS_VERCEL_PROJECT_ID`, `ANALYTICS_VERCEL_TEAM_ID`, `GSC_PROPERTY`, `GSC_SERVICE_ACCOUNT_EMAIL` แล้ว ตรวจจากรายการ Environment Variables และข้อความบันทึกสำเร็จ
- เปิด Search Console API ใน Google Cloud project `gen-lang-client-0851745083` แล้ว สร้าง `pod4u-search-console-reader@gen-lang-client-0851745083.iam.gserviceaccount.com` โดยไม่เพิ่ม project-level roles และยืนยันสิทธิ์ Restricted บน `sc-domain:pod4u.store` แล้ว
- สร้าง JSON key ของบัญชีบริการแล้ว (key ID `968c70ad350c800ee1803ed147682224a59781ce`) และผู้ใช้บันทึก `GSC_SERVICE_ACCOUNT_PRIVATE_KEY` เป็น Production Secret แล้ว ไม่ส่งคีย์ผ่านแชตหรือ repository
- สร้าง `CRON_SECRET` แบบสุ่ม 96 ตัวอักษรและบันทึกเป็น Production Secret แล้ว โดยใช้ร่วมกับ cron เดิมตามการตั้งค่าของแอป
- นำ migration `website_analytics_dashboard` ไปใช้กับ Production แล้ว ระบบบันทึก version `20260910162630`; ตรวจแล้วฟังก์ชันให้ EXECUTE เฉพาะ `service_role` และตารางปิดสิทธิ์ `anon`/`authenticated`
- ทดสอบ Vercel API แบบ read-only ด้วยบัญชี CLI ได้จริง รูปแบบ totals/day/country ตรงกับ adapter
- deploy Production สำเร็จ และทดสอบซิงก์จริงแล้วเมื่อ 2026-09-10: Google Search Console, Vercel Analytics และ health checks สำเร็จครบทั้งช่วง 7/28 วัน โดยไม่มีการเปิดเผย credentials
- หลังทดสอบจริงพบว่า Next.js จำผลอ่าน snapshot ว่างก่อนซิงก์ จึงเปลี่ยนการอ่านและการซิงก์ให้ใช้ Supabase client แบบ `cache: no-store` เพื่อให้หน้า Dashboard เห็นข้อมูลล่าสุดเสมอ
- รอบปรับความครบถ้วนเพิ่มคำค้นและหน้าปลายทางจาก Google Search Console แยกจากยอดรวม พร้อมคำแนะนำตามข้อมูลจริง และย่อส่วนคู่มือตั้งค่าเมื่อเชื่อมต่อครบแล้ว
- API ของบัญชีที่ตรวจจำกัดข้อมูลย้อนหลัง 31 วัน: รายงาน 28 วันปัจจุบันอาจอ่านได้ แต่ 28 วันก่อนหน้าจะเกินช่วงที่อนุญาต ระบบเก็บรายงานปัจจุบันและแสดงว่าเทียบไม่ได้
- อย่ารวมงาน warehouse ที่อยู่ระหว่างแก้เข้ากับการ commit/deploy ชุดนี้โดยไม่ตรวจ scope

## 1. ติดตั้งตารางสถิติ

ไฟล์: `supabase/migrations/20260910162630_website_analytics_dashboard.sql`

ให้ AI/ผู้ดูแลฐานข้อมูลตรวจ migration history และนำ **เฉพาะไฟล์นี้** ไปใช้กับโปรเจกต์ `puslxgriozubqlpoxrqo` หากยังไม่มี ห้ามใช้คำสั่ง push migrations ทั้งหมดโดยไม่ตรวจ migration ที่ค้างอยู่

Migration สร้าง:

- `website_analytics_snapshots`: ผลสำเร็จล่าสุดของแต่ละแหล่ง/property/project และช่วง 7/28 วัน
- `website_analytics_runs`: ประวัติซิงก์และข้อความผิดพลาดที่ตัดข้อมูลลับออกแล้ว
- `acquire_website_analytics_sync()`: ป้องกัน cron/แอดมินหลายคนซิงก์พร้อมกัน และเว้นระยะอย่างน้อย 60 วินาที

ทั้งสองตารางเปิด RLS และถอนสิทธิ์ `PUBLIC`, `anon`, `authenticated` เหลือเฉพาะ `service_role` ซึ่งใช้ฝั่งเซิร์ฟเวอร์ ฟังก์ชันใช้ SECURITY INVOKER และให้ EXECUTE เฉพาะ service_role

หลังติดตั้งต้องทดสอบ: service role อ่านได้, anon/authenticated อ่านและเขียนไม่ได้, การ acquire พร้อมกันได้ run ID เพียงคำขอเดียว

## 2. เชื่อม Google Search Console

1. ใช้ Google Cloud project ที่ต้องการสำหรับการเชื่อมต่อ และเปิด **Google Search Console API**
2. สร้าง service account สำหรับอ่านสถิติ โดยไม่ให้สิทธิ์ระดับ Project Owner/Editor ที่ไม่จำเป็น
3. สร้าง JSON key แล้วเก็บอย่างปลอดภัย อย่าแนบไฟล์หรือวาง private key ลงแชต/repository
4. ใน Search Console เลือก property `pod4u.store` → Settings → Users and permissions → เพิ่ม `client_email` จาก JSON เป็นผู้มีสิทธิ์อ่านรายงาน (เริ่มจาก Restricted)
5. ใน Vercel project → Settings → Environment Variables ตั้งค่าฝั่ง Production:

| ตัวแปร | ค่า |
| --- | --- |
| `GSC_PROPERTY` | `sc-domain:pod4u.store` สำหรับ Domain property ที่ยืนยันไว้ |
| `GSC_SERVICE_ACCOUNT_EMAIL` | `client_email` จาก JSON key |
| `GSC_SERVICE_ACCOUNT_PRIVATE_KEY` | `private_key` ทั้งชุด รวม BEGIN/END PRIVATE KEY; รับ newline จริงหรือ `\n` ได้ |

ใช้ OAuth scope `https://www.googleapis.com/auth/webmasters.readonly` เท่านั้น ชุดนี้แยกจาก service account ของการนำเข้าสินค้า

หาก 403: ตรวจว่าเปิด API ใน project ที่ออก key แล้ว และอีเมล service account ได้สิทธิ์บน **property เดียวกับ GSC_PROPERTY** ไม่ใช่เพียงบัญชีของผู้พัฒนา

## 3. เชื่อม Vercel Analytics

1. ตรวจว่า Web Analytics เปิดอยู่ในโปรเจกต์ `vaping-shop`
2. สร้าง Vercel access token สำหรับทีม/โปรเจกต์ที่ต้องการและกำหนดวันหมดอายุ มีสิทธิ์อ่าน Web Analytics และ Deployments เท่าที่ระบบสิทธิ์ของบัญชีรองรับ
3. ตั้งค่าใน Environment Variables:

| ตัวแปร | ค่า |
| --- | --- |
| `ANALYTICS_VERCEL_TOKEN` | token ใหม่สำหรับ Dashboard; เก็บเป็น Secret |
| `ANALYTICS_VERCEL_PROJECT_ID` | `prj_LIEiiyr3V5yRLdMYCYTKYjOvtLfy` (ตรวจจาก Project Settings อีกครั้ง) |
| `ANALYTICS_VERCEL_TEAM_ID` | `team_hGZeKUjBiXqFFm1UDytOhYMU` (ตรวจจาก Team Settings อีกครั้ง) |

ไม่คัดลอก CLI token ส่วนตัวขึ้น Production และไม่ใช้ `VERCEL_OIDC_TOKEN` แทน Vercel access token

API ที่ใช้: `/v1/query/web-analytics/visits/aggregate`, `/v6/deployments` ไม่มี scraping dashboard และไม่มี paid Drains

การ query totals ใช้ `by=environment` และกรอง `production` ให้ได้ยอดรวมหนึ่งแถว **ไม่บวก visitors รายวันหรือรายหน้า**

กรอง `/admin`, `/warehouse`, `/member`, `/api`, `/register` ออกจากทุก query ให้ยอดรวม/กราฟ/ตารางใช้ฐานเดียวกัน ตัด query string ก่อนเก็บ path ไม่เก็บ IP, raw user-agent, referrer URL เต็ม, user ID หรือ event ของสมาชิก

Referrer แบบ Direct อาจมาจากแอปที่ไม่ส่ง referrer จึงไม่ควรตีความว่าเป็นการพิมพ์ URL โดยตรงทั้งหมด หรือระบุว่าเป็น LINE โดยไม่มีหลักฐาน

## 4. ตั้งซิงก์อัตโนมัติและ deploy

- ตั้ง `CRON_SECRET` เป็น random secret ยาวเพียงพอ เช่นผล `openssl rand -base64 32` **หากมีอยู่แล้วให้ใช้ค่าเดิม** เพราะ stock-import cron ใช้ตัวแปรนี้ร่วมกัน
- ไม่เปิด `STOCK_IMPORT_AUTO_APPLY` เป็นส่วนหนึ่งของงาน Dashboard
- `vercel.json` เพิ่ม `/api/cron/website-analytics` ตาราง `0 22 * * *` (ช่วง 05:00 น. กรุงเทพฯ) โดยเก็บตาราง stock-import เดิมไว้
- Vercel cron ใช้ Production และเรียกด้วย Authorization Bearer CRON_SECRET; การมีคีย์อย่างเดียวไม่ยืนยันว่า cron รันแล้ว ต้องตรวจประวัติหลัง deploy
- ทำ migration ก่อน deploy จากนั้น commit/push เฉพาะไฟล์งาน Dashboard ที่ตรวจแล้ว และตรวจ deployment Ready
- Environment Variables ใหม่มีผลกับ deployment ใหม่ กำหนด Preview/Development แยกตามที่ต้องการ ไม่แชร์ key โดยไม่จำเป็น
- เข้า `/admin/analytics` ด้วย owner/manager แล้วกด **ซิงก์ข้อมูล** หาก key บางแหล่งยังไม่มี ระบบข้ามแหล่งนั้นและแสดงเหตุผล

ชุดนี้ตรวจ HTTP เป็นครั้ง ๆ เมื่อซิงก์ ไม่ใช่ระบบเฝ้าระวัง uptime 24 ชั่วโมง ไม่มี runtime error rate หรือ Core Web Vitals ที่ยังไม่ได้เชื่อมจริง

## 5. วิธีอ่านตัวเลข

- ตัวเลือก 7/28 วัน ใช้ช่วงที่เท่ากันเพื่อเทียบช่วงก่อนหน้า
- Google: ใช้ Web Search และ final data วันตาม America/Los_Angeles โดยเว้น 3 วันล่าสุด; ยอดรวมใช้ `dimensions=date` แบบ property ส่วนตารางคำค้นใช้ `query` และหน้าปลายทางใช้ `page` แยก request เพื่อไม่บวกตารางที่ถูกจำกัดแถวเป็นยอดรวม
- คำค้นบางส่วนอาจไม่ปรากฏเพราะ Google ปกปิดคำค้นปริมาณน้อยเพื่อความเป็นส่วนตัว ดังนั้นยอดรวม impressions/clicks อาจมากกว่าผลรวมในตารางคำค้น
- Vercel: ใช้วันเต็มตาม UTC ไม่รวมวันนี้ วันที่ API ส่งกลับอาจ normalize `until` ไปยังต้นวันถัดไป
- แต่ละกราฟระบุช่วงวันที่และ timezone แยก ไม่บวก Google clicks กับ Vercel visitors
- CTR = clicks / impressions; position ถ่วงน้ำหนักด้วย impressions ไม่เฉลี่ยอันดับรายวันแบบหารจำนวนวัน
- `—` หมายถึงยังไม่มีค่าที่ใช้ได้, `0` คืออ่านสำเร็จแล้วได้ศูนย์, error แสดงแยกจาก empty
- ถ้าช่วงก่อนหน้ามีค่า 0 หรือ API อ่านไม่ได้ จะไม่สร้างเปอร์เซ็นต์ Infinity หรืออ้างการเติบโต 100%
- ล้มเหลวรอบใหม่ไม่เขียนทับ snapshot สำเร็จเดิม แสดง error/stale ประกอบข้อมูลเก่า เกิน 36 ชั่วโมงแสดงข้อมูลเก่า
- กราฟเว้นช่องว่างสำหรับวันที่ไม่มีแถวข้อมูล ไม่เติมศูนย์โดยเดาเอง
- เส้น deploy คือวันที่สร้าง deployment ซึ่งปัจจุบัน Ready (UTC) ไม่ใช่เวลาที่ alias ถูกเปลี่ยนหรือเวลาที่ผู้ใช้ทุกคนเห็นเวอร์ชันนั้น
- Snapshot เก็บล่าสุดแต่ละช่วง ไม่ใช่ data warehouse สำหรับเลือกย้อนหลังทุกเดือน ประวัติซิงก์ที่เสร็จแล้วเก็บ 90 วันและล้างเมื่อมีการซิงก์

## ตรวจรับงาน

1. `npm run test:website-analytics` — ทดสอบวัน/การรวมตัวเลข/adapter/failure/stale/permission ด้วยข้อมูลจำลองที่ไม่แตะ Production
2. `npx tsc --noEmit --incremental false`
3. `npm run build`
4. ผู้ไม่ล็อกอินอ่าน API ไม่ได้, order_staff/support/stock_staff ได้ 403; หน้า Dashboard ตรวจสิทธิ์บนเซิร์ฟเวอร์ด้วย
5. POST sync ปฏิเสธ Origin ต่างเว็บ, cron ปฏิเสธ Bearer token ที่ไม่ตรง
6. ตรวจ UI 390px และ desktop ทั้งสถานะรอเชื่อมต่อและข้อมูลทดสอบ; fixture ใช้ใน browser test เท่านั้น ไม่มีปุ่มเปิดข้อมูลปลอมใน Production
7. หลังตั้งค่าจริงตรวจยอดตาม **ช่วงเวลา/filters เดียวกัน** กับ Console ต้นทาง, ทดสอบยกเลิกสิทธิ์หนึ่งแหล่งแล้วข้อมูลแหล่งอื่นยังแสดงได้
8. ตรวจงาน warehouse ที่ค้างแยกต่างหาก ก่อนนำ diff ไป commit/deploy

### ผลตรวจในเครื่อง 2026-09-10

- Unit/contract checks ผ่าน 16 กรณี รวมการจำกัดช่วงย้อนหลัง 31 วัน, การเก็บ snapshot เดิมเมื่อ API ล้มเหลว, การแยก property/project และการคำนวณตัวเลข
- TypeScript ผ่าน และ production build ผ่าน 55/55 (จำนวนนี้รวม route ปัจจุบันของ workspace ซึ่งมีงาน warehouse อยู่ด้วย)
- HTTP authorization ผ่าน: anonymous API 401 / หน้า redirect, staff API 403 / หน้า redirect, days ผิด 400, Origin ต่างเว็บหรือหายไป 403, cron ไม่มี token 401
- Owner อ่านสถานะจริงในเครื่องได้: missing storage / not configured แยกชัด ไม่มีตัวเลขปลอม
- Browser: 1440px / 390px ไม่ล้น, กราฟ 2 ชุด render ได้ด้วย fixture, เมนูมือถือปิดหลังเลือกหน้า, เปลี่ยน 7/28 วัน, ลิงก์ตั้งค่า และข้อความ error หลัง sync ถูกทดสอบแล้ว
- Fixture ใช้เฉพาะการ intercept ใน browser test; ไม่ได้บันทึกลงฐานข้อมูลและไม่มีในหน้าจอใช้งานจริง
- พบ 404 ของ `/_vercel/insights/script.js` จาก Analytics component เดิมเมื่อรัน production build ในเครื่อง (route นี้ให้บริการบน Vercel) ไม่มีข้อผิดพลาด JavaScript ของ Dashboard ที่ตรวจพบ
- ทดสอบ GSC และ Vercel ด้วย credentials จริงแล้ว, เขียน snapshot จริงสำเร็จ, ตรวจสิทธิ์ตาราง/RPC แล้วว่า `anon` และ `authenticated` ใช้ไม่ได้ ขณะที่ `service_role` ใช้ได้
- ภาพหน้าจอสถานะจริงที่ยังไม่ตั้งค่า: `output/playwright/analytics-unconfigured-desktop.png`, `output/playwright/analytics-unconfigured-mobile.png`

เอกสารอ้างอิง: [Google Search Analytics](https://developers.google.com/webmaster-tools/v1/searchanalytics/query), [Vercel Web Analytics API](https://vercel.com/docs/analytics/web-analytics-api), [Vercel aggregate API](https://vercel.com/docs/rest-api/web-analytics/aggregates-page-views), [Supabase Data API security](https://supabase.com/docs/guides/api/securing-your-api)

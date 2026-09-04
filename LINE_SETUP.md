# LINE Messaging API Setup

ไฟล์นี้สรุปค่าที่ต้องเตรียมสำหรับอัปเดต Rich Menu และทำระบบตอบลูกค้าผ่านหลังบ้าน

## ค่าที่ต้องใส่

ใส่ค่าต่อไปนี้ในไฟล์ `.env.local` ที่ root ของโปรเจกต์ ห้าม commit ค่าจริงขึ้น Git

```env
# ใช้สร้าง/อัปโหลด Rich Menu และส่ง Reply, Push, Broadcast
LINE_CHANNEL_ACCESS_TOKEN=

# ใช้ตรวจสอบลายเซ็นของข้อความที่ LINE ส่งเข้า Webhook
LINE_CHANNEL_SECRET=

# URL ของเว็บที่ deploy แล้ว ไม่ต้องใส่ / ต่อท้าย
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## ไปเอาค่าจากที่ไหน

### `LINE_CHANNEL_ACCESS_TOKEN`

1. เข้า LINE Developers Console
2. เลือก Provider และ Messaging API Channel ของร้าน
3. เปิดแท็บ **Messaging API**
4. ไปที่หัวข้อ **Channel access token**
5. Issue token แล้วนำมาใส่ใน `.env.local`

### `LINE_CHANNEL_SECRET`

1. เปิด Channel เดิมใน LINE Developers Console
2. เปิดแท็บ **Basic settings**
3. คัดลอกค่าจากหัวข้อ **Channel secret**
4. นำมาใส่ใน `.env.local`

## ตั้งค่า Webhook

หลังจาก deploy เว็บแล้ว ให้ตั้ง Webhook URL ในแท็บ **Messaging API** เป็น:

```text
https://your-domain.com/api/line/webhook
```

จากนั้น:

1. กด **Verify** ให้สถานะผ่าน
2. เปิด **Use webhook**
3. ปิด Auto-reply messages หากต้องการให้ระบบในเว็บเป็นผู้ตอบหลัก

## ใช้ค่าอะไรกับฟีเจอร์ใด

| ฟีเจอร์ | Access Token | Channel Secret | Webhook |
|---|---:|---:|---:|
| สร้างและอัปโหลด Rich Menu | จำเป็น | ไม่จำเป็น | ไม่จำเป็น |
| ตั้ง Rich Menu เป็นค่าเริ่มต้น | จำเป็น | ไม่จำเป็น | ไม่จำเป็น |
| ตอบข้อความอัตโนมัติ | จำเป็น | จำเป็น | จำเป็น |
| รับข้อความเข้า Admin Inbox | จำเป็น | จำเป็น | จำเป็น |
| แอดมินส่งข้อความหาลูกค้า | จำเป็น | ไม่จำเป็นต่อการส่ง | ต้องมีเพื่อเก็บข้อความขาเข้า |
| Broadcast | จำเป็น | ไม่จำเป็น | ไม่จำเป็น |

## ค่าที่ยังไม่จำเป็น

- `LINE_CHANNEL_ID` ยังไม่จำเป็นสำหรับโค้ดปัจจุบัน
- LINE Login credentials ยังไม่จำเป็น เว้นแต่จะเพิ่มปุ่มล็อกอินด้วย LINE
- ไม่ต้องมี LINE MCP เพราะโปรเจกต์เรียก LINE Messaging API โดยตรง

## ความปลอดภัย

- อย่าส่ง Token หรือ Channel Secret ผ่านแชต
- อย่าใส่ค่าจริงใน `.env.example` หรือไฟล์เอกสารนี้
- ตั้งค่าจริงทั้งใน `.env.local` และ Environment Variables ของระบบที่ deploy
- หาก Token หรือ Secret หลุด ให้ revoke/reissue และอัปเดตค่าที่ deploy ทันที

## สถานะโค้ดปัจจุบัน

- LINE API client: `src/lib/line-client.ts`
- Webhook endpoint: `src/app/api/line/webhook/route.ts`
- Rich Menu uploader: ยังไม่ได้สร้าง
- Admin Inbox และการบันทึกข้อความ: ยังไม่ได้เชื่อมต่อ

เมื่อกรอก `LINE_CHANNEL_ACCESS_TOKEN` และ `LINE_CHANNEL_SECRET` แล้ว จึงสามารถทดสอบการเชื่อมต่อและเริ่มทำ Rich Menu/Admin Inbox ต่อได้

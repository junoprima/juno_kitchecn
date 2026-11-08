# ครัวแม่ · ระบบรับพรีออเดอร์อาหาร

เว็บรับออเดอร์ล่วงหน้า: ลูกค้าสั่งวันนี้ → แม่ทำสด → ส่งวันถัดไป  ค่าใช้จ่าย **0 บาท**

| ส่วน | ใช้อะไร | ฟรี |
|---|---|---|
| Frontend + Backend | **Next.js 15** (App Router, Server Actions) + Tailwind CSS v4 | ✓ |
| ฐานข้อมูล | **Supabase** (PostgreSQL) | Free tier 500 MB |
| โค้ด | **GitHub** | ✓ |
| โฮสต์ | **Vercel** Hobby | ✓ |

## หน้าเว็บ
- `/` หน้าลูกค้า: เลือกเมนู + จำนวน, ใส่ชื่อ (บังคับ) / เบอร์ / หมายเหตุ แล้วกดส่ง
- `/order/[id]` ใบยืนยันออเดอร์ มีเลขออเดอร์ 4 ตัว และสถานะ
- `/admin` (ต้องใส่รหัส) ออเดอร์แยกตามวันส่ง, สรุป **“ต้องทำ”** (รวมจำนวนต่อเมนู), ยอดเงินรวม, กดรับออเดอร์ / ส่งแล้ว / ยกเลิก
- `/admin/menu` เพิ่ม/แก้/ลบเมนู, แก้ราคา, เปิด-ปิดขาย, จำกัดจำนวนต่อวัน, เรียงลำดับ, เปิด-ปิดร้าน, ตั้งเวลาปิดรับ, ประกาศหน้าร้าน

## กติกาวันส่ง
สั่งก่อนเวลาปิดรับ (ค่าเริ่มต้น 20:00 เวลาไทย) → ส่ง **พรุ่งนี้**  ·  สั่งหลังเวลาปิดรับ → ส่ง **มะรืน**
เมนูที่ตั้ง “จำกัด/วัน” จะนับรวมทุกออเดอร์ของวันส่งเดียวกัน (ไม่นับที่ยกเลิก) และกันสั่งเกิน

## โครงสร้างฐานข้อมูล (`db/schema.sql`)
```
menu_items     id, name, description, price, daily_limit, is_available, sort_order
shop_settings  accepting_orders, cutoff_time, notice              (แถวเดียว)
orders         id, code, customer_name, phone, note, delivery_date, status, total, created_at
order_items    order_id → orders, menu_item_id → menu_items, name, price, qty   (เก็บชื่อ/ราคา ณ ตอนสั่ง)
```
status: `new` → `confirmed` → `done` (หรือ `cancelled`)

## ติดตั้ง (ครั้งแรก)

### 1. Supabase
1. สมัคร https://supabase.com → New project (Region: Singapore)
2. **SQL Editor** → วางเนื้อหา `db/schema.sql` → Run  (อยากได้เมนูตัวอย่าง: วาง `db/seed.sql` แล้ว Run)
3. **Connect** (ปุ่มด้านบน) → **Transaction pooler** → คัดลอก URI (port `6543`) แล้วแทน `[YOUR-PASSWORD]`

### 2. Vercel
1. https://vercel.com → Sign up ด้วย GitHub → **Add New → Project** → เลือก repo นี้
2. Environment Variables:
   - `DATABASE_URL` = URI จาก Supabase
   - `ADMIN_PASSWORD` = รหัสหลังร้านของแม่
3. Deploy → ได้ลิงก์ `https://<ชื่อ>.vercel.app` ส่งให้ลูกค้าในไลน์ได้เลย
   ทุกครั้งที่ push ขึ้น `main` Vercel จะ deploy ใหม่เอง

### รันบนเครื่อง
```bash
cp .env.example .env.local   # ใส่ค่าจริง
npm install
npm run db:setup             # หรือ npm run db:seed เพื่อใส่เมนูตัวอย่าง
npm run dev
```

> หมายเหตุ Supabase free: ถ้าไม่มีใครใช้งาน 7 วัน โปรเจกต์จะถูก pause — เข้า dashboard กด Restore ได้ฟรี

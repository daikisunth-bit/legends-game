# M2.6 — One-Upload Deployment

## เป้าหมาย

หลังตั้งค่า GitHub, Render, Cloudflare Pages และ Neon ครั้งแรกแล้ว การอัปเดตเกมรอบต่อไปเหลือเพียง:

1. แตก ZIP รุ่นใหม่
2. อัปโหลดไฟล์ทั้งหมดทับ Repository เดิมผ่าน GitHub Web
3. Commit ไปที่ `main`
4. รอ Render และ Cloudflare Pages Auto Deploy
5. เปิดลิงก์เกม

## สิ่งที่เพิ่ม

- Production bootstrap ตรวจ Environment Variables ก่อนเปิด Server
- เชื่อม Neon พร้อม Retry รองรับ Cold Start
- รัน SQL Migration อัตโนมัติก่อน Server เปิด
- ใช้ PostgreSQL advisory lock ป้องกันหลาย Render instance รัน Migration พร้อมกัน
- รัน Seed แบบ idempotent อัตโนมัติ
- Deploy ล้มเหลวอย่างชัดเจนหาก Database หรือ Migration ไม่พร้อม
- ไม่แสดงสถานะพร้อมก่อน Migration สำเร็จ
- ZIP ส่งมอบไม่มี `.env`, `node_modules`, `dist`, log หรือ Secret

## ข้อจำกัดที่ยังต้องตั้งครั้งเดียว

บริการ Cloud ไม่สามารถเดา Secret ได้ จึงยังต้องมีค่าต่อไปนี้ใน Render ครั้งแรก:

- `DATABASE_URL`
- `JWT_SECRET`
- `CLIENT_ORIGINS`
- `INVITE_CODE`

Cloudflare Pages ต้องมีครั้งแรก:

- `VITE_API_URL`
- `VITE_WS_URL`

หลังจากตั้งครบแล้ว การอัปเดตโค้ดปกติไม่ต้องตั้งซ้ำ

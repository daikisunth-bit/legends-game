# วิธีอัปเดต M3 ผ่าน GitHub Web

1. แตกไฟล์ ZIP นี้
2. เปิดโฟลเดอร์ `M3-update`
3. เข้า GitHub Repository ของเกม
4. กด `Add file` → `Upload files`
5. ลากทุกไฟล์และโฟลเดอร์ที่อยู่ข้างใน `M3-update` ไปวาง
6. Commit message: `Add M3 character progression core`
7. เลือก `Commit directly to main`
8. กด `Commit changes`
9. รอ Render และ Cloudflare Auto Deploy

ไม่ต้องลบไฟล์เก่า และไม่มีไฟล์ Secret ในชุดอัปเดตนี้
Migration `008_m3_progression.sql` จะถูกรันอัตโนมัติเมื่อ Render เปิด Backend รุ่นใหม่

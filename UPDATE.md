# วิธีอัปเดตผ่าน GitHub Web

1. แตก ZIP
2. เปิดโฟลเดอร์ `M4-S1-update`
3. เข้า GitHub Repository เดิม
4. Add file → Upload files
5. ลากทุกอย่างภายใน `M4-S1-update` ขึ้น Repository
6. Commit message: `Add M4 Sprint 1 skill priority core`
7. Commit ไปที่ branch `main`
8. รอ Render และ Cloudflare Auto Deploy

ไม่ต้องลบไฟล์เก่า และไม่ต้องตั้งค่า Environment Variable เพิ่ม
Render จะรัน migration `009_m4_skill_loadouts.sql` อัตโนมัติก่อนเปิด Server

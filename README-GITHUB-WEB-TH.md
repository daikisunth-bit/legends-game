# คู่มืออัปเดตโปรเจกต์ผ่าน GitHub บนเว็บเท่านั้น

คู่มือนี้ไม่ใช้ GitHub Desktop, Git command หรือ PowerShell

## วิธีที่แนะนำ: อัปโหลดไฟล์ชุดใหม่ทับ Repository เดิม

> GitHub หน้าเว็บจำกัดการอัปโหลดครั้งละ 100 ไฟล์ และไฟล์ละไม่เกินขนาดที่ GitHub กำหนด หากโฟลเดอร์มีไฟล์มาก ให้ทำทีละโฟลเดอร์ ห้ามอัปโหลด `node_modules`, `dist`, `.env` หรือไฟล์ Secret

### 1. เตรียมไฟล์

1. แตก ZIP รุ่นล่าสุดในคอม
2. เปิดโฟลเดอร์ `legends-game`
3. ต้องเห็น `packages`, `database`, `.github`, `package.json`, `package-lock.json`, `render.yaml`
4. ห้ามอัปโหลดโฟลเดอร์ `node_modules`

### 2. เปิด Repository

1. เข้า `https://github.com`
2. Login
3. กดรูปโปรไฟล์ → **Your repositories**
4. เปิด Repository `legends-game`
5. ตรวจว่าอยู่ Branch `main`

### 3. อัปโหลดไฟล์ Root

1. กด **Add file** → **Upload files**
2. ลากไฟล์ Root ที่เปลี่ยน เช่น `package.json`, `package-lock.json`, `render.yaml`, `.npmrc`
3. ช่อง Commit message ใส่ `M2.5 online stability`
4. เลือก **Commit directly to the main branch**
5. กด **Commit changes**

### 4. อัปโหลดแต่ละโฟลเดอร์

ทำซ้ำกับ `.github`, `database`, `docs`, `packages`, `scripts`

- เปิดโฟลเดอร์ปลายทางใน GitHub ก่อน
- กด **Add file** → **Upload files**
- ลากไฟล์จากโฟลเดอร์เดียวกันเข้ามา
- GitHub จะเขียนทับไฟล์ชื่อเดิมและเพิ่มไฟล์ใหม่

### 5. ตรวจสิ่งที่ห้ามอยู่ใน GitHub

ใช้ช่องค้นหาของ Repository ตรวจว่าไม่มี:

- `.env`
- `DATABASE_URL`
- `DATABASE_URL_DIRECT`
- `JWT_SECRET`
- Neon password
- `node_modules`
- `dist`

`.env.example` อยู่ได้ เพราะมีเพียงตัวอย่างชื่อค่า

## ตั้ง GitHub Secret สำหรับ Migration

1. Repository → **Settings**
2. ซ้ายมือ → **Secrets and variables** → **Actions**
3. กด **New repository secret**
4. Name: `DATABASE_URL_DIRECT`
5. Secret: วาง Neon Direct Connection String
6. กด **Add secret**

ค่าจริงจะไม่แสดงในโค้ดหรือ Log ปกติ

## รัน Migration โดยไม่ใช้เครื่องตัวเอง

1. Repository → แท็บ **Actions**
2. ซ้ายมือเลือก **Run Neon migrations**
3. กด **Run workflow**
4. Branch เลือก `main`
5. กดปุ่มสีเขียว **Run workflow**
6. รอเครื่องหมายถูกสีเขียว

Workflow จะรัน Migration เฉพาะไฟล์ที่ยังไม่เคยรัน และตรวจว่าถึง `006_m25_stability.sql`

## ตรวจ Auto Deploy

หลัง Commit เข้า `main`:

- Render จะเริ่ม Deploy Backend ใหม่
- Cloudflare Pages จะเริ่ม Build Frontend ใหม่
- GitHub Actions `CI` จะตรวจ TypeScript, Lint, Test และ Build

ไปที่แท็บ **Actions** แล้วรอ Workflow `CI` เป็นสีเขียวก่อนทดสอบเกม

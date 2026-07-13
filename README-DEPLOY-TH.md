# คู่มือ Deploy Legends of Class Evolution (GitHub + Cloudflare Pages + Render + Neon)

สถาปัตยกรรมนี้แยก Frontend ออกจาก Backend ชัดเจน:

- **GitHub**: Source Code ทั้ง Monorepo
- **Cloudflare Pages**: `packages/client` เท่านั้น
- **Render**: `packages/server` เท่านั้น
- **Neon PostgreSQL**: ข้อมูลผู้เล่นทั้งหมด

Browser ติดต่อ Render เท่านั้น และไม่มีโค้ด Frontend ส่วนใดติดต่อ Neon โดยตรง

## 0. ตรวจสอบในเครื่อง

ต้องใช้ Node.js 22+

```bash
npm ci
npm run verify
```

คำสั่ง `verify` รัน Type Check, ESLint, Tests และ Production Build

## 1. GitHub แบบจับมือทำ

1. สมัคร GitHub และกด **New repository**
2. ตั้งชื่อ เช่น `legends-of-class-evolution`
3. ไม่ต้องสร้าง README จากหน้าเว็บ เพราะโปรเจกต์มีไฟล์แล้ว
4. ในโฟลเดอร์โปรเจกต์รัน:

```bash
git init
git add .
git commit -m "chore: prepare cloud deployment"
git branch -M main
git remote add origin https://github.com/YOUR_NAME/YOUR_REPOSITORY.git
git push -u origin main
```

ก่อน Push ให้ตรวจว่า `.env` ไม่ถูกติดตาม:

```bash
git status
git ls-files | grep -E '(^|/)\.env($|\.)'
```

คำสั่งสุดท้ายต้องไม่แสดง `.env`, Secret, Key หรือ Connection String ใด ๆ

## 2. Neon PostgreSQL

1. สมัคร Neon และสร้าง Project
2. สร้าง Database สำหรับเกม
3. หน้า **Connect** จะมี Connection String สองแบบ
   - **Pooled**: ใช้เป็น `DATABASE_URL` บน Render
   - **Direct**: ใช้เป็น `DATABASE_URL_DIRECT` เฉพาะตอน Migration
4. บนเครื่องตัวเองตั้งค่าแบบชั่วคราว แล้วรัน:

```bash
export DATABASE_URL_DIRECT='YOUR_DIRECT_NEON_URL'
npm run db:migrate
npm run db:seed
```

Windows PowerShell:

```powershell
$env:DATABASE_URL_DIRECT='YOUR_DIRECT_NEON_URL'
npm run db:migrate
npm run db:seed
```

Migration จะรันตามลำดับและบันทึกไว้ใน `schema_migrations` จึงไม่รันซ้ำโดยไม่ตั้งใจ

### SQL Migration ที่ต้องรัน

- `database/migrations/001_initial.sql`
- `database/migrations/002_m1_constraints.sql`
- `database/migrations/003_deploy_architecture.sql`
- `database/migrations/004_retention_indexes.sql`

โปรเจกต์เดิมที่มีข้อมูลอยู่แล้วต้องรันเฉพาะ Migration ที่ยังไม่เคยถูกบันทึกใน `schema_migrations` ห้ามลบฐานข้อมูลเดิม

## 3. Render Backend

1. สมัคร Render และเชื่อม GitHub
2. เลือก **New > Blueprint** แล้วเลือก Repository
3. Render จะอ่าน `render.yaml`
4. กรอก Environment Variables ที่มี `sync: false`
5. Deploy และรอจน `/health` ตอบสถานะ `ok`

### Render Configuration

- **Build Command**: `npm ci && npm run build:server`
- **Start Command**: `npm run start -w @loce/server`
- **Health Check Path**: `/health`
- **Runtime**: Node.js 22

Render Free Tier อาจ Cold Start หลังไม่มีการใช้งาน หน้าเกมจึงมี Loading/Reconnecting UI และ Health Retry ในตัว

## 4. Cloudflare Pages Frontend

1. สมัคร Cloudflare
2. ไปที่ **Workers & Pages > Create > Pages > Connect to Git**
3. เลือก GitHub Repository เดียวกัน
4. ตั้งค่า:

- **Framework preset**: Vite
- **Root directory**: `/`
- **Build command**: `npm ci && npm run build:client`
- **Build output directory**: `packages/client/dist`
- **Node version**: 22

5. เพิ่ม Environment Variables:

```text
VITE_API_URL=https://YOUR_RENDER_SERVICE.onrender.com
VITE_WS_URL=https://YOUR_RENDER_SERVICE.onrender.com
```

6. Deploy แล้วนำ URL `.pages.dev` ไปเพิ่มใน Render ตัวแปร `CLIENT_ORIGINS`

ไฟล์ `packages/client/public/_redirects` ทำให้ SPA Refresh หน้าใดก็ไม่ 404 และ `_headers` กำหนด Cache สำหรับ Asset ที่มี Hash

## Environment Variables ที่ต้องกรอก

### Cloudflare Pages (Public)

- `VITE_API_URL`
- `VITE_WS_URL`

ค่าที่ขึ้นต้นด้วย `VITE_` มองเห็นได้ใน Browser จึงห้ามเป็น Secret

### Render (Secret / Server-only)

- `DATABASE_URL` — Neon pooled URL
- `JWT_SECRET` — สุ่มอย่างน้อย 32 ตัวอักษร
- `CLIENT_ORIGINS` — URL Cloudflare Pages และ localhost คั่นด้วย comma
- `INVITE_CODE` — รหัสเชิญ Alpha

### Render Optional

- `ENABLE_REGISTRATION`
- `DB_POOL_MAX`
- `RATE_LIMIT_MAX`
- `RATE_LIMIT_WINDOW`
- `LOG_LEVEL`
- `BATTLE_HISTORY_RETENTION_DAYS`
- `PVP_HISTORY_RETENTION_DAYS`
- `MAIL_RETENTION_DAYS`

`DATABASE_URL_DIRECT` ไม่ควรใส่ใน Frontend และไม่จำเป็นต้องใส่ใน Render Runtime ถ้า Migration รันจากเครื่องหรือ GitHub Actions

## Autosave และการป้องกันข้อมูลซ้ำ

- Client Batch การเปลี่ยนแปลงและ Debounce 1.5 วินาที
- Server ตรวจ Schema ทุก Payload
- `/save/batch` ใช้ `idempotencyKey`
- `/battle/start` ใช้ `idempotencyKey`
- Reward, Currency, Item, Quest และ Battle Result บันทึกใน Transaction เดียว
- Save ล้มเหลวจะไม่แสดงว่าสำเร็จ และ Client Retry ด้วยข้อมูลเดิม
- Server คืน Response เดิมเมื่อ Request เดิมถูกส่งซ้ำ

## Load Test

ติดตั้ง k6 แล้วรัน:

```bash
BASE_URL=https://YOUR_RENDER_SERVICE.onrender.com npm run loadtest
```

ทดสอบ Endpoint ที่ล็อกอิน:

```bash
BASE_URL=https://YOUR_RENDER_SERVICE.onrender.com ACCESS_TOKEN=YOUR_TEST_TOKEN npm run loadtest
```

ห้ามรับประกัน Concurrent Users จนกว่าจะทำ Load Test ด้วยข้อมูลและพฤติกรรมจริง

## Checklist ทดสอบระบบ

### Login
- [ ] สมัครด้วย Invite Code ถูกต้องได้
- [ ] Invite Code ผิดถูกปฏิเสธ
- [ ] Login ผิดหลายครั้งโดน Rate Limit
- [ ] Token หมดอายุแล้วกลับหน้า Login อย่างถูกต้อง

### Save
- [ ] เปลี่ยน Setting แล้ว Save หลัง Debounce
- [ ] ปิดเน็ตระหว่าง Save ไม่แสดงว่าสำเร็จ
- [ ] ต่อเน็ตใหม่แล้ว Retry สำเร็จ
- [ ] ส่ง idempotencyKey ซ้ำแล้วข้อมูลไม่เพิ่มซ้ำ

### Inventory
- [ ] Inventory โหลดเฉพาะ Account ที่ Login
- [ ] Item ของผู้เล่นอื่นไม่หลุดมา
- [ ] Reward ซ้ำไม่สร้าง Item ซ้ำ
- [ ] Equipped Slot ไม่ซ้ำกัน

### Quest
- [ ] Quest Progress เพิ่มหลัง Battle จบเท่านั้น
- [ ] Battle ล้มเหลวไม่เพิ่ม Progress
- [ ] Claim ซ้ำไม่ได้

### Combat
- [ ] Client ส่งเฉพาะ nodeId/presetId/idempotencyKey
- [ ] Server โหลด Stats และ Build จาก Database
- [ ] Reward อยู่ใน Transaction เดียวกับ Battle Result
- [ ] Retry หลัง Timeout ไม่สร้าง Reward ซ้ำ

### Reconnect
- [ ] Frontend เปิดได้แม้ Render กำลัง Cold Start
- [ ] Banner แสดงสถานะ Backend/Database ไม่พร้อม
- [ ] ปุ่มลองใหม่ทำงาน
- [ ] WebSocket reconnect โดยไม่ทำให้ REST Login หลุด

## Security Checklist

- [ ] ไม่มี `.env`, Secret หรือ Database URL ใน Git
- [ ] Browser ไม่ติดต่อ Neon โดยตรง
- [ ] CORS ระบุ Origin จริง ไม่มี `*` เมื่อใช้ Credential/Auth
- [ ] JWT Secret ยาวและสุ่ม
- [ ] Password Hash ใช้ Argon2id
- [ ] ทุก Input ผ่าน Shared Zod Schema
- [ ] SQL ทุก Query ใช้ Parameter `$1`, `$2` ไม่มี String Concatenation
- [ ] Currency/Reward/Drop/Damage/Cooldown คำนวณฝั่ง Server
- [ ] Rate Limit เปิดทั้ง Global และ Route สำคัญ
- [ ] Health Endpoint ไม่เปิดเผย Secret
- [ ] Log ไม่บันทึก Password, Token หรือ Connection String
- [ ] Registration ปิดได้และรองรับ Invite Code
- [ ] Neon ใช้ Pooled URL สำหรับ Runtime
- [ ] Migration ใช้ Direct URL
- [ ] Dependency Audit และ Update เป็นระยะ

## Retention และ Log Cleanup

รันตามกำหนดเวลา เช่น สัปดาห์ละครั้ง:

```bash
DATABASE_URL_DIRECT='YOUR_DIRECT_NEON_URL' npm run db:cleanup
```

ค่าเริ่มต้น:

- PvE Battle: 7 วัน
- PvP/WB Battle: 30 วัน
- Request Deduplication: 2 วัน
- Application Log: 14 วัน

## Rollback

### Cloudflare Pages
1. ไปที่ Pages Project > Deployments
2. เลือก Deployment รุ่นก่อนที่ใช้งานได้
3. กด Rollback/Promote to production
4. ตรวจว่า `VITE_API_URL` ยังตรงกับ Render

### Render
1. ไปที่ Service > Deploys
2. เลือก Deploy รุ่นก่อนหน้า
3. กด Rollback หรือ Redeploy Commit เดิม
4. ตรวจ `/health` ก่อนเปิดให้ผู้เล่น

### Database
- Migration ใช้แนวทาง additive-first และไม่ลบ Column เดิม
- ก่อน Migration สำคัญให้สร้าง Neon Branch หรือ Backup
- หาก Backend รุ่นใหม่มีปัญหา ให้ Rollback Backend ก่อน ไม่ต้องย้อน Database ถ้า Migration เป็นแบบ Additive
- Migration ที่ลบหรือแปลงข้อมูลต้องมีไฟล์ Down Migration และแผน Restore แยกต่างหากก่อน Deploy

## Auto Deploy

- Push เข้า `main` ทำให้ Cloudflare Pages และ Render Build ใหม่อัตโนมัติ
- แนะนำใช้ Pull Request และให้ GitHub Actions รัน `npm run verify` ก่อน Merge
- ห้าม Merge เมื่อ Type Check, Lint, Test หรือ Build ไม่ผ่าน

---

## อัปเดต M2.5: ใช้ GitHub ผ่านเว็บไซต์เท่านั้น

เจ้าของโปรเจกต์ไม่ได้ใช้ GitHub Desktop และไม่จำเป็นต้องรันคำสั่งในเครื่อง

อ่านขั้นตอนอัปโหลดแบบทีละคลิกที่:

- `README-GITHUB-WEB-TH.md`

### Migration ผ่าน GitHub Actions

หลังอัปโหลด M2.5 ให้ทำดังนี้:

1. GitHub Repository → **Settings**
2. **Secrets and variables** → **Actions**
3. เพิ่ม Secret ชื่อ `DATABASE_URL_DIRECT`
4. ไปแท็บ **Actions**
5. เลือก **Run Neon migrations**
6. กด **Run workflow**

ไม่ต้องเปิด PowerShell และไม่ต้องติดตั้ง Node.js ในเครื่อง

### Health endpoints M2.5

- Render Health Check: `/health/live`
- ตรวจ Backend + Neon + Migration: `/health`
- Strict readiness: `/health/ready`

ถ้า `/health` แสดง `schema: outdated` ให้รัน GitHub Action **Run Neon migrations**

### Cloudflare Pages M2.5

Build Command:

```text
npm ci --no-audit --no-fund && npm run build:client
```

Build Output Directory:

```text
packages/client/dist
```

M2.5 มี `package-lock.json` ที่ใช้ Public npm Registry แล้ว ไม่ต้องลบไฟล์นี้ และไม่ต้องใช้ `SKIP_DEPENDENCY_INSTALL`

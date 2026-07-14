# Render TypeScript Build Fix

อัปโหลดไฟล์ `render.yaml` ทับไฟล์เดิมใน GitHub Repository แล้ว Commit ไปที่ `main`.

สาเหตุ: Render ตั้ง `NODE_ENV=production` ทำให้ npm ไม่ติดตั้ง devDependencies ซึ่งมี `typescript` และ `@types/pg`.

การแก้ไข: Build command เปลี่ยนเป็น:

```text
npm ci --include=dev --no-audit --no-fund && npm run build:server
```

หลัง Commit ให้รอ Render Auto Deploy หรือกด Manual Deploy > Deploy latest commit.

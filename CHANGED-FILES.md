# รายการไฟล์ที่แก้หรือเพิ่ม

## ย้ายโดยรักษาโค้ดเดิม
- `packages/server-api/` → `packages/server/`
- รวมแนวทาง Realtime เดิมเข้าสู่ `packages/server/src/realtime/socket-server.ts`
- ลบ Package `server-realtime` แยกเพื่อลดจำนวน Render Service

## Root
- `.gitignore`
- `.env.example`
- `package.json`
- `package-lock.json`
- `tsconfig.base.json`
- `eslint.config.js`
- `render.yaml`
- `README-DEPLOY-TH.md`
- `CHANGED-FILES.md`

## Client
- `packages/client/package.json`
- `packages/client/tsconfig.json`
- `packages/client/vite.config.ts`
- `packages/client/public/_redirects`
- `packages/client/public/_headers`
- `packages/client/src/App.tsx`
- `packages/client/src/api/client.ts`
- `packages/client/src/ui/AuthScreen.tsx`
- `packages/client/src/components/BackendStatus.tsx`
- `packages/client/src/hooks/useBackendStatus.ts`
- `packages/client/src/services/autosave.ts`
- `packages/client/src/vite-env.d.ts`
- `packages/client/src/styles.css`

## Server
- `packages/server/package.json`
- `packages/server/tsconfig.json`
- `packages/server/src/app.ts`
- `packages/server/src/main.ts`
- `packages/server/src/config.ts`
- `packages/server/src/domain/errors.ts`
- `packages/server/src/infrastructure/database.ts`
- `packages/server/src/application/auth-service.ts`
- `packages/server/src/routes/auth-routes.ts`
- `packages/server/src/routes/game-routes.ts`
- `packages/server/src/services/game-service.ts`
- `packages/server/src/realtime/socket-server.ts`

## Shared
- `packages/shared/package.json`
- `packages/shared/src/index.ts`
- `packages/shared/src/types/api.ts`
- `packages/shared/src/schemas/auth.ts`
- `packages/shared/src/schemas/game.ts`
- `packages/shared/src/combat/engine.ts`
- `packages/shared/src/combat/engine.test.ts`
- `packages/shared/src/schemas/auth.test.ts`

## Database / Operations
- `database/migrations/003_deploy_architecture.sql`
- `database/migrations/004_retention_indexes.sql`
- `database/seeds/001_game_seed.sql`
- `scripts/migrate.mjs`
- `scripts/seed.mjs`
- `scripts/cleanup-logs.mjs`
- `scripts/load-test.js`

## M2 additions
- `.npmrc` and repaired `package-lock.json` public registry URLs.
- `packages/shared/src/data/maps.ts`
- Expanded battle API types and schemas.
- Deterministic PvE battle service and routes.
- `database/migrations/005_m2_pve_cards.sql`
- `MapScreen.tsx`, `BattleScreen.tsx`, updated `TownScreen.tsx` and styles.
- `docs/M2_STATUS.md`

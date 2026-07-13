# M2.5 Changed Files

## Deployment and package stability
- `package.json`
- `package-lock.json`
- `packages/client/package.json`
- `packages/server/package.json`
- `packages/shared/package.json`
- `render.yaml`
- `.github/workflows/ci.yml`
- `.github/workflows/migrate-neon.yml`
- `.github/workflows/cleanup-database.yml`

## Backend health and schema readiness
- `packages/server/src/app.ts`
- `packages/server/src/infrastructure/schema-status.ts`
- `packages/shared/src/version.ts`
- `packages/shared/src/types/api.ts`
- `packages/shared/src/index.ts`
- `scripts/check-schema.mjs`
- `database/migrations/006_m25_stability.sql`

## Client resilience
- `packages/client/src/hooks/useBackendStatus.ts`
- `packages/client/src/components/BackendStatus.tsx`
- `packages/client/src/App.tsx`
- `packages/client/src/services/autosave.ts`
- `packages/client/src/styles.css`

## Documentation
- `docs/M2_5_STATUS.md`
- `README-GITHUB-WEB-TH.md`
- `CHANGED-FILES-M2.5.md`

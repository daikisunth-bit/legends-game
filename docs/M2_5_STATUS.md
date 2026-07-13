# M2.5 — Online Stability & Web-only GitHub Workflow

Status: **implemented**

## Included

- Public npm lockfile suitable for GitHub Actions, Render, and Cloudflare Pages.
- Workspace package versions aligned (`@loce/shared` 0.4.5).
- Separate liveness and readiness health endpoints.
- Database migration awareness in `/health`.
- Render health check no longer fails only because Neon is waking or a migration is pending.
- Frontend cold-start, offline, database-down, and migration-required states.
- Exponential reconnect with browser online/visibility recovery.
- Autosave keeps the same idempotency key across retries and browser refreshes.
- Manual Neon migration workflow from GitHub Actions.
- Scheduled/manual retention cleanup workflow.
- GitHub web upload/update guide for a user who does not use GitHub Desktop or Terminal.
- Required schema migration `006_m25_stability.sql`.

## Health endpoints

- `/health/live`: process liveness; Render uses this.
- `/health`: user-facing dependency status; always returns a status body.
- `/health/ready`: strict readiness; returns HTTP 503 when database/schema is not ready.

## Required owner action after uploading

1. Add GitHub repository secret `DATABASE_URL_DIRECT`.
2. Run **Actions → Run Neon migrations → Run workflow**.
3. Confirm Render `/health/live` and `/health`.
4. Re-deploy Cloudflare Pages from the newest commit.

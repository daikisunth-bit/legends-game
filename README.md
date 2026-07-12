# Legends of Class Evolution — M1 Account & Job Vertical Slice

M1 is a locally playable web vertical slice containing real PostgreSQL-backed registration/login, starter Job selection, persistent account bootstrap, Riverdale town shell, Job switching in town, Tier 2 secret silhouettes, and Tier 3 future silhouettes.

## Run locally

Requirements: Node.js 22+, pnpm 10+, Docker.

```bash
cp .env.example .env
docker compose up -d postgres redis
pnpm install
pnpm build
pnpm dev
```

Open `http://localhost:5173`.

## Included

- No Novice data or onboarding path.
- Register/login with Argon2id password hashing and JWT access tokens.
- PostgreSQL account and per-Job records.
- Choose Swordman, Mage, Archer, or Healer once.
- Job Master screen with Tier 2/Tier 3 secret silhouettes.
- Switch among unlocked Jobs while in town.
- Server validates every mutation.

## Not included yet

M2 will add Phaser field/battle scenes, Map 1 monster groups, deterministic PvE route, rewards, EXP, and persisted battle recovery. This M1 is not yet an internet-hosted deployment; it runs locally or on a server you deploy.

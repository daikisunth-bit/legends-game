import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Client } = pg;

const REQUIRED_ENV = ["DATABASE_URL", "JWT_SECRET", "CLIENT_ORIGINS", "INVITE_CODE"];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]?.trim());
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

const connectionString = process.env.DATABASE_URL;
const maxAttempts = Number.parseInt(process.env.BOOTSTRAP_DB_RETRY_ATTEMPTS ?? "8", 10);
const baseDelayMs = Number.parseInt(process.env.BOOTSTRAP_DB_RETRY_DELAY_MS ?? "2500", 10);
const advisoryLockId = 714_202_606;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectWithRetry() {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const client = new Client({
      connectionString,
      ssl: connectionString.includes("localhost") ? undefined : { rejectUnauthorized: false },
      connectionTimeoutMillis: 15_000
    });
    try {
      await client.connect();
      await client.query("SELECT 1");
      return client;
    } catch (error) {
      lastError = error;
      await client.end().catch(() => undefined);
      if (attempt === maxAttempts) break;
      const delay = Math.min(baseDelayMs * attempt, 20_000);
      console.warn(`[bootstrap] Database unavailable (attempt ${attempt}/${maxAttempts}). Retrying in ${delay}ms.`);
      await sleep(delay);
    }
  }
  throw lastError ?? new Error("Unable to connect to database");
}

const client = await connectWithRetry();
try {
  await client.query("SELECT pg_advisory_lock($1)", [advisoryLockId]);
  console.log("[bootstrap] Acquired database migration lock.");

  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const migrationDirectory = path.resolve("database/migrations");
  const migrations = (await readdir(migrationDirectory))
    .filter((filename) => filename.endsWith(".sql"))
    .sort();

  for (const filename of migrations) {
    const applied = await client.query(
      "SELECT 1 FROM schema_migrations WHERE filename = $1 LIMIT 1",
      [filename]
    );
    if (applied.rowCount) continue;

    console.log(`[bootstrap] Applying migration ${filename}...`);
    const sql = await readFile(path.join(migrationDirectory, filename), "utf8");
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations(filename) VALUES($1)", [filename]);
    console.log(`[bootstrap] Applied migration ${filename}.`);
  }

  const seedDirectory = path.resolve("database/seeds");
  const seeds = (await readdir(seedDirectory))
    .filter((filename) => filename.endsWith(".sql"))
    .sort();

  for (const filename of seeds) {
    console.log(`[bootstrap] Applying idempotent seed ${filename}...`);
    const sql = await readFile(path.join(seedDirectory, filename), "utf8");
    await client.query(sql);
  }

  const latest = await client.query(
    "SELECT filename FROM schema_migrations ORDER BY filename DESC LIMIT 1"
  );
  console.log(`[bootstrap] Database ready. Latest migration: ${latest.rows[0]?.filename ?? "none"}.`);
} finally {
  await client.query("SELECT pg_advisory_unlock($1)", [advisoryLockId]).catch(() => undefined);
  await client.end();
}

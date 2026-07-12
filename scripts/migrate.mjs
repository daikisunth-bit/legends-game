import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
const { Client } = pg;
const connectionString = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("Set DATABASE_URL_DIRECT or DATABASE_URL");
const client = new Client({ connectionString, ssl: connectionString.includes("localhost") ? undefined : { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query("CREATE TABLE IF NOT EXISTS schema_migrations(filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  const dir = path.resolve("database/migrations");
  const files = (await readdir(dir)).filter((file) => file.endsWith(".sql")).sort();
  for (const filename of files) {
    const found = await client.query("SELECT 1 FROM schema_migrations WHERE filename=$1", [filename]);
    if (found.rowCount) continue;
    const sql = await readFile(path.join(dir, filename), "utf8");
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations(filename) VALUES($1)", [filename]);
    console.log(`Applied ${filename}`);
  }
} finally { await client.end(); }

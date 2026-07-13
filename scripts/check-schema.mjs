import pg from "pg";
const { Client } = pg;
const required = "006_m25_stability.sql";
const connectionString = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("Set DATABASE_URL_DIRECT or DATABASE_URL");
const client = new Client({
  connectionString,
  ssl: connectionString.includes("localhost") ? undefined : { rejectUnauthorized: false }
});
await client.connect();
try {
  const result = await client.query(
    "SELECT filename FROM schema_migrations WHERE filename=$1 LIMIT 1",
    [required]
  );
  if (!result.rowCount) throw new Error(`Required migration is missing: ${required}`);
  console.log(`Schema is current: ${required}`);
} finally {
  await client.end();
}

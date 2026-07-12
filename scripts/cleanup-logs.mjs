import pg from "pg";
const { Client } = pg;
const connectionString = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("Set DATABASE_URL_DIRECT or DATABASE_URL");
const battleDays = Number(process.env.BATTLE_HISTORY_RETENTION_DAYS ?? 7);
const pvpDays = Number(process.env.PVP_HISTORY_RETENTION_DAYS ?? 30);
const client = new Client({ connectionString, ssl: connectionString.includes("localhost") ? undefined : { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query("DELETE FROM battles WHERE kind='pve' AND created_at < NOW() - ($1 || ' days')::interval", [battleDays]);
  await client.query("DELETE FROM battles WHERE kind IN ('pvp','wb') AND created_at < NOW() - ($1 || ' days')::interval", [pvpDays]);
  await client.query("DELETE FROM request_deduplication WHERE created_at < NOW() - INTERVAL '2 days'");
  await client.query("DELETE FROM application_logs WHERE created_at < NOW() - INTERVAL '14 days'");
  console.log("Retention cleanup completed");
} finally { await client.end(); }

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
const { Client } = pg;
const connectionString = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("Set DATABASE_URL_DIRECT or DATABASE_URL");
const client = new Client({ connectionString, ssl: connectionString.includes("localhost") ? undefined : { rejectUnauthorized: false } });
await client.connect();
try {
  for (const filename of (await readdir("database/seeds")).filter((file) => file.endsWith(".sql")).sort()) {
    await client.query(await readFile(path.join("database/seeds", filename), "utf8"));
    console.log(`Seeded ${filename}`);
  }
} finally { await client.end(); }

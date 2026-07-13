import type { Pool } from "pg";

export interface SchemaStatus {
  readonly current: boolean;
  readonly latestApplied: string | null;
}

export async function readSchemaStatus(pool: Pool, requiredMigration: string): Promise<SchemaStatus> {
  try {
    const result = await pool.query<{ filename: string }>(
      "SELECT filename FROM schema_migrations ORDER BY filename DESC LIMIT 1"
    );
    const latestApplied = result.rows[0]?.filename ?? null;
    const required = await pool.query(
      "SELECT 1 FROM schema_migrations WHERE filename = $1 LIMIT 1",
      [requiredMigration]
    );
    return { current: Boolean(required.rowCount), latestApplied };
  } catch {
    return { current: false, latestApplied: null };
  }
}

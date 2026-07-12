import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

export class Database {
  readonly pool: Pool;
  constructor(connectionString: string, maxConnections: number) {
    this.pool = new Pool({
      connectionString,
      max: maxConnections,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      ssl: connectionString.includes("localhost") ? undefined : { rejectUnauthorized: false }
    });
  }
  query<T extends QueryResultRow>(text: string, values: readonly unknown[] = []): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, [...values]);
  }
  async transaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await operation(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  async healthCheck(): Promise<boolean> {
    try { await this.pool.query("SELECT 1"); return true; } catch { return false; }
  }
  async close(): Promise<void> { await this.pool.end(); }
}

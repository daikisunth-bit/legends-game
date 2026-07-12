import type { Pool, PoolClient } from "pg";
import { JOB_DEFINITIONS, STARTER_JOB_IDS, type PlayableJobId, type StarterJobId } from "@loce/shared";
import { randomUUID } from "node:crypto";
import { AppError } from "../domain/errors.js";

export interface AccountRecord {
  readonly id: string;
  readonly username: string;
  readonly displayName: string;
  readonly passwordHash: string;
}

export interface AccountBootstrap {
  readonly accountId: string;
  readonly displayName: string;
  readonly starterJobSelected: boolean;
  readonly currentJobId: PlayableJobId | null;
  readonly jobs: readonly { jobId: PlayableJobId; level: number; unlocked: boolean; rebirthCount: number }[];
}

export class AccountRepository {
  constructor(private readonly pool: Pool) {}

  async findByUsername(username: string): Promise<AccountRecord | null> {
    const result = await this.pool.query<{ id: string; username: string; display_name: string; password_hash: string }>(
      "SELECT id, username, display_name, password_hash FROM accounts WHERE username = $1 AND status = 'active'",
      [username]
    );
    const row = result.rows[0];
    return row ? { id: row.id, username: row.username, displayName: row.display_name, passwordHash: row.password_hash } : null;
  }

  async create(client: PoolClient, input: { username: string; displayName: string; passwordHash: string }): Promise<string> {
    const accountId = randomUUID();
    try {
      await client.query(
        "INSERT INTO accounts (id, username, display_name, password_hash) VALUES ($1, $2, $3, $4)",
        [accountId, input.username, input.displayName, input.passwordHash]
      );
      await client.query("INSERT INTO account_state (account_id) VALUES ($1)", [accountId]);
      for (const jobId of [...STARTER_JOB_IDS, ...Object.keys(JOB_DEFINITIONS).filter((id) => !STARTER_JOB_IDS.includes(id as StarterJobId))]) {
        const definition = JOB_DEFINITIONS[jobId as PlayableJobId];
        await client.query(
          "INSERT INTO jobs (account_id, job_id, tier, unlocked) VALUES ($1, $2, $3, FALSE)",
          [accountId, jobId, definition.tier === 1 ? "tier1" : "tier2"]
        );
      }
      return accountId;
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
        throw new AppError("error.auth.accountAlreadyExists", 409);
      }
      throw error;
    }
  }

  async bootstrap(accountId: string): Promise<AccountBootstrap> {
    const state = await this.pool.query<{ display_name: string; starter_job_selected: boolean; current_job_id: PlayableJobId | null }>(
      `SELECT a.display_name, s.starter_job_selected, s.current_job_id
       FROM accounts a JOIN account_state s ON s.account_id = a.id WHERE a.id = $1`, [accountId]
    );
    const account = state.rows[0];
    if (!account) throw new AppError("error.auth.accountNotFound", 404);
    const jobs = await this.pool.query<{ job_id: PlayableJobId; level: number; unlocked: boolean; rebirth_count: number }>(
      "SELECT job_id, level, unlocked, rebirth_count FROM jobs WHERE account_id = $1 ORDER BY tier, job_id", [accountId]
    );
    return {
      accountId,
      displayName: account.display_name,
      starterJobSelected: account.starter_job_selected,
      currentJobId: account.current_job_id,
      jobs: jobs.rows.map((row) => ({ jobId: row.job_id, level: row.level, unlocked: row.unlocked, rebirthCount: row.rebirth_count }))
    };
  }

  async selectStarterJob(client: PoolClient, accountId: string, jobId: StarterJobId): Promise<void> {
    const state = await client.query<{ starter_job_selected: boolean }>("SELECT starter_job_selected FROM account_state WHERE account_id = $1 FOR UPDATE", [accountId]);
    if (state.rows[0]?.starter_job_selected) throw new AppError("error.onboarding.starterAlreadySelected", 409);
    await client.query("UPDATE jobs SET unlocked = TRUE WHERE account_id = $1 AND job_id = $2", [accountId, jobId]);
    await client.query(
      "UPDATE account_state SET current_job_id = $2, starter_job_selected = TRUE, tutorial_flags = tutorial_flags || $3::jsonb WHERE account_id = $1",
      [accountId, jobId, JSON.stringify({ jobSwitchingIntroPending: true })]
    );
  }

  async switchJob(accountId: string, jobId: PlayableJobId): Promise<void> {
    const result = await this.pool.query(
      `UPDATE account_state s SET current_job_id = $2
       WHERE s.account_id = $1 AND EXISTS (
         SELECT 1 FROM jobs j WHERE j.account_id = $1 AND j.job_id = $2 AND j.unlocked = TRUE
       )`, [accountId, jobId]
    );
    if (result.rowCount !== 1) throw new AppError("error.jobs.jobLocked", 403);
  }
}

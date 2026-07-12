import { createHash, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import type { BattleStartResponse, InventoryEntry, QuestProgress } from "@loce/shared";
import type { Database } from "../infrastructure/database.js";
import { AppError } from "../domain/errors.js";

export class GameService {
  constructor(private readonly database: Database) {}

  async inventory(accountId: string): Promise<readonly InventoryEntry[]> {
    const result = await this.database.query<{ id: string; item_id: string; rarity: InventoryEntry["rarity"]; enhance_level: number; equipped_slot: string | null }>(
      "SELECT id, item_id, rarity, enhance_level, equipped_slot FROM items WHERE account_id=$1 ORDER BY created_at DESC LIMIT 300", [accountId]
    );
    return result.rows.map((row) => ({ id: row.id, itemId: row.item_id, rarity: row.rarity, enhanceLevel: row.enhance_level, equippedSlot: row.equipped_slot }));
  }

  async quests(accountId: string): Promise<readonly QuestProgress[]> {
    const result = await this.database.query<{ quest_id: string; progress: number; target: number; claimed: boolean }>(
      "SELECT quest_id, progress, target, claimed FROM quests_daily WHERE account_id=$1 AND quest_date=CURRENT_DATE ORDER BY quest_id", [accountId]
    );
    return result.rows.map((row) => ({ questId: row.quest_id, progress: row.progress, target: row.target, claimed: row.claimed }));
  }

  async startBattle(accountId: string, nodeId: string, idempotencyKey: string): Promise<BattleStartResponse> {
    return this.database.transaction(async (client) => {
      const prior = await client.query<{ response: BattleStartResponse }>(
        "SELECT response FROM request_deduplication WHERE account_id=$1 AND idempotency_key=$2 FOR UPDATE", [accountId, idempotencyKey]
      );
      if (prior.rows[0]) return prior.rows[0].response;
      const state = await client.query<{ current_job_id: string | null; gold: string }>(
        "SELECT current_job_id, gold FROM account_state WHERE account_id=$1 FOR UPDATE", [accountId]
      );
      if (!state.rows[0]?.current_job_id) throw new AppError("error.battle.noActiveJob", 409);

      const seed = Math.floor(Math.random() * 2_147_483_647);
      const victory = nodeId !== "map1.alpha_direwolf" || seed % 3 !== 0;
      const exp = victory ? (nodeId.includes("alpha") ? 120 : 45) : 0;
      const gold = victory ? (nodeId.includes("alpha") ? 80 : 18) : 0;
      const itemIds = victory && seed % 8 === 0 ? ["training_sword"] : [];
      const battleId = randomUUID();
      const checksum = createHash("sha256").update(`${battleId}:${seed}:${victory}:${exp}:${gold}`).digest("hex");
      const response: BattleStartResponse = { battleId, outcome: victory ? "victory" : "defeat", seed, ticksElapsed: 80 + (seed % 120), rewards: { exp, gold, itemIds }, checksum };

      await client.query(
        "INSERT INTO battles (battle_id, account_id, kind, node_id, seed, data_version, result, total_damage, acknowledged) VALUES ($1,$2,'pve',$3,$4,$5,$6,0,FALSE)",
        [battleId, accountId, nodeId, seed, "0.3.0", JSON.stringify(response)]
      );
      if (victory) await this.applyRewards(client, accountId, battleId, state.rows[0].current_job_id, exp, gold, itemIds);
      await client.query("INSERT INTO request_deduplication(account_id,idempotency_key,route,response) VALUES($1,$2,$3,$4)", [accountId, idempotencyKey, "/battle/start", JSON.stringify(response)]);
      return response;
    });
  }

  private async applyRewards(client: PoolClient, accountId: string, battleId: string, jobId: string, exp: number, gold: number, itemIds: readonly string[]): Promise<void> {
    await client.query("UPDATE jobs SET exp=exp+$3 WHERE account_id=$1 AND job_id=$2", [accountId, jobId, exp]);
    const balance = await client.query<{ gold: string }>("UPDATE account_state SET gold=gold+$2 WHERE account_id=$1 RETURNING gold", [accountId, gold]);
    await client.query("INSERT INTO transactions(id,account_id,currency,delta,balance_after,reason,ref_id,source) VALUES($1,$2,'gold',$3,$4,'battle_reward',$5,'game')", [randomUUID(), accountId, gold, balance.rows[0]?.gold ?? "0", battleId]);
    for (const itemId of itemIds) await client.query("INSERT INTO items(id,account_id,item_id,rarity,enhance_level) VALUES($1,$2,$3,'common',0)", [randomUUID(), accountId, itemId]);
    await client.query("UPDATE quests_daily SET progress=LEAST(target,progress+1),updated_at=NOW() WHERE account_id=$1 AND quest_date=CURRENT_DATE AND quest_id='hunters_duty'", [accountId]);
  }
}

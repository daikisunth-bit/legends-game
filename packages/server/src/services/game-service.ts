import { createHash, randomInt, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import {
  BATTLE_NODES,
  JOB_DEFINITIONS,
  MONSTERS,
  ULTIMATE_BY_JOB,
  PASSIVE_BY_JOB,
  simulateBattle,
  type BattleStartResponse,
  type CombatStats,
  type InventoryEntry,
  type MapContentResponse,
  type PlayableJobId,
  type QuestProgress
} from "@loce/shared";
import type { Database } from "../infrastructure/database.js";
import { AppError } from "../domain/errors.js";
import type { SkillService } from "./skill-service.js";

interface ActiveJobRow {
  current_job_id: PlayableJobId | null;
  map_unlocks: unknown;
  gold: string;
  level: number;
  exp: string;
  stat_str: number;
  stat_dex: number;
  stat_con: number;
  stat_int: number;
}

const EXP_BASE = 50;
const EXP_POWER = 1.8;
const expToNext = (level: number): number => Math.floor(EXP_BASE * level ** EXP_POWER);

export class GameService {
  constructor(private readonly database: Database, private readonly skills: SkillService) {}

  async inventory(accountId: string): Promise<readonly InventoryEntry[]> {
    const result = await this.database.query<{ id:string; item_id:string; rarity:InventoryEntry["rarity"]; enhance_level:number; equipped_slot:string|null }>(
      "SELECT id,item_id,rarity,enhance_level,equipped_slot FROM items WHERE account_id=$1 ORDER BY created_at DESC LIMIT 300", [accountId]
    );
    return result.rows.map((row) => ({ id:row.id, itemId:row.item_id, rarity:row.rarity, enhanceLevel:row.enhance_level, equippedSlot:row.equipped_slot }));
  }

  async quests(accountId: string): Promise<readonly QuestProgress[]> {
    await this.ensureDailyQuests(accountId);
    const result = await this.database.query<{ quest_id:string; progress:number; target:number; claimed:boolean }>(
      "SELECT quest_id,progress,target,claimed FROM quests_daily WHERE account_id=$1 AND quest_date=CURRENT_DATE ORDER BY quest_id", [accountId]
    );
    return result.rows.map((row) => ({ questId:row.quest_id, progress:row.progress, target:row.target, claimed:row.claimed }));
  }

  async mapContent(accountId: string): Promise<MapContentResponse> {
    const state = await this.database.query<{ map_unlocks: unknown }>("SELECT map_unlocks FROM account_state WHERE account_id=$1", [accountId]);
    const raw = state.rows[0]?.map_unlocks;
    const unlocks = Array.isArray(raw) ? raw.filter((value): value is string => typeof value === "string") : ["map1"];
    return {
      maps: (["map1","map2","map3","map4"] as const).map((mapId) => ({
        mapId,
        unlocked: unlocks.includes(mapId),
        nodes: BATTLE_NODES.filter((node) => node.mapId === mapId).map((node) => {
          const monster = MONSTERS[node.monsterId];
          return { nodeId:node.id, mapId, monsterId:monster.id, monsterName:monster.displayName, monsterLevel:monster.level, miniBoss:monster.miniBoss, recommendedLevel:node.recommendedLevel };
        })
      }))
    };
  }

  async startBattle(accountId: string, nodeId: string, idempotencyKey: string): Promise<BattleStartResponse> {
    return this.database.transaction(async (client) => {
      const prior = await client.query<{ response: BattleStartResponse }>(
        "SELECT response FROM request_deduplication WHERE account_id=$1 AND idempotency_key=$2 FOR UPDATE", [accountId,idempotencyKey]
      );
      if (prior.rows[0]) return prior.rows[0].response;

      const node = BATTLE_NODES.find((candidate) => candidate.id === nodeId);
      if (!node) throw new AppError("error.battle.invalidNode", 404);
      const monster = MONSTERS[node.monsterId];
      const state = await client.query<ActiveJobRow>(
        `SELECT s.current_job_id,s.map_unlocks,s.gold,j.level,j.exp,j.stat_str,j.stat_dex,j.stat_con,j.stat_int
         FROM account_state s JOIN jobs j ON j.account_id=s.account_id AND j.job_id=s.current_job_id
         WHERE s.account_id=$1 FOR UPDATE`, [accountId]
      );
      const row = state.rows[0];
      if (!row?.current_job_id) throw new AppError("error.battle.noActiveJob",409);
      const unlocks = Array.isArray(row.map_unlocks) ? row.map_unlocks : ["map1"];
      if (!unlocks.includes(node.mapId)) throw new AppError("error.map.locked",403);

      const seed = randomInt(1, 2_147_483_647);
      const playerStats = this.buildPlayerStats(row);
      const prioritySkills = await this.skills.resolveForBattle(accountId,row.current_job_id,row.level);
      const ultimate = row.level >= 30 ? ULTIMATE_BY_JOB[row.current_job_id] : undefined;
      const passive = row.level >= 10 ? PASSIVE_BY_JOB[row.current_job_id] : undefined;
      const setup = {
        seed,
        tickLimit: 3000,
        units: [
          { id:`player:${accountId}`, side:"player" as const, stats:playerStats, prioritySkills, ...(ultimate ? { ultimate } : {}), ...(passive ? { passive } : {}) },
          { id:`monster:${monster.id}`, side:"enemy" as const, stats:monster.stats }
        ]
      };
      const result = simulateBattle(setup);
      const victory = result.outcome === "victory";
      const gold = victory ? randomInt(monster.goldMin, monster.goldMax + 1) : 0;
      const exp = victory ? monster.exp : 0;
      const itemIds = victory ? monster.equipmentDrops.filter((drop) => Math.random() < drop.chance).map((drop) => drop.itemId) : [];
      const cardIds = victory && Math.random() < monster.cardDropChance ? [monster.id] : [];
      const battleId = randomUUID();
      const checksum = createHash("sha256").update(`${result.checksum}:${battleId}:${gold}:${exp}:${itemIds.join(",")}:${cardIds.join(",")}`).digest("hex");
      const response: BattleStartResponse = {
        battleId,nodeId,monsterId:monster.id,monsterName:monster.displayName,outcome:result.outcome,seed,
        ticksElapsed:result.ticksElapsed,setup,events:result.events,rewards:{exp,gold,itemIds,cardIds},checksum
      };

      await client.query(
        "INSERT INTO battles(battle_id,account_id,kind,node_id,seed,data_version,result,total_damage,acknowledged) VALUES($1,$2,'pve',$3,$4,$5,$6,$7,FALSE)",
        [battleId,accountId,nodeId,seed,"0.8.0",JSON.stringify(response),this.totalPlayerDamage(result.events,accountId)]
      );
      if (victory) await this.applyRewards(client,accountId,battleId,row,exp,gold,itemIds,cardIds,monster.miniBoss);
      await client.query("INSERT INTO request_deduplication(account_id,idempotency_key,route,response) VALUES($1,$2,'/battle/start',$3)",[accountId,idempotencyKey,JSON.stringify(response)]);
      return response;
    });
  }

  async acknowledgeBattle(accountId: string, battleId: string): Promise<{ acknowledged: true }> {
    const result = await this.database.query("UPDATE battles SET acknowledged=TRUE WHERE battle_id=$1 AND account_id=$2",[battleId,accountId]);
    if (result.rowCount !== 1) throw new AppError("error.battle.notFound",404);
    return { acknowledged:true };
  }

  private buildPlayerStats(row: ActiveJobRow): CombatStats {
    const definition = JOB_DEFINITIONS[row.current_job_id!];
    const str = definition.baseStats.str + row.stat_str;
    const dex = definition.baseStats.dex + row.stat_dex;
    const con = definition.baseStats.con + row.stat_con;
    const int = definition.baseStats.int + row.stat_int;
    const magicJobs = new Set<PlayableJobId>(["mage","healer","spell_archer","sage","bard"]);
    const patk = row.level + str * 2;
    const matk = row.level + int * 2;
    return {
      maxHp:100 + row.level * 20 + con * 25,
      patk: magicJobs.has(row.current_job_id!) ? matk : patk,
      matK:matk,
      def:con,
      hit:80 + dex,
      flee:row.level + dex * .4,
      critRate:Math.min(50,5 + dex * .1),
      critDamage:150,
      spd:100 + dex * .5,
      maxEnergy:100 + int * .5,
      energyGainMultiplier:1 + int * .001
    };
  }

  private totalPlayerDamage(events: readonly { actorId:string; type:string; amount?:number }[], accountId:string): number {
    return events.filter((event) => event.actorId === `player:${accountId}` && event.type === "damage").reduce((sum,event) => sum + (event.amount ?? 0),0);
  }

  private async applyRewards(client: PoolClient, accountId:string, battleId:string, row:ActiveJobRow, exp:number, gold:number, itemIds:readonly string[], cardIds:readonly string[], miniBoss:boolean): Promise<void> {
    let level = row.level;
    let storedExp = Number(row.exp) + exp;
    let gainedLevels = 0;
    while (level < 100 && storedExp >= expToNext(level)) { storedExp -= expToNext(level); level += 1; gainedLevels += 1; }
    if (level >= 100) storedExp = 0;
    await client.query("UPDATE jobs SET level=$3,exp=$4,unspent_points=unspent_points+$5 WHERE account_id=$1 AND job_id=$2",[accountId,row.current_job_id,level,storedExp,gainedLevels*4]);
    const balance = await client.query<{ gold:string }>("UPDATE account_state SET gold=gold+$2,updated_at=NOW() WHERE account_id=$1 RETURNING gold",[accountId,gold]);
    await client.query("INSERT INTO transactions(id,account_id,currency,delta,balance_after,reason,ref_id,source) VALUES($1,$2,'gold',$3,$4,'battle_reward',$5,'game')",[randomUUID(),accountId,gold,balance.rows[0]?.gold ?? "0",battleId]);
    for (const itemId of itemIds) await client.query("INSERT INTO items(id,account_id,item_id,rarity,enhance_level) VALUES($1,$2,$3,'common',0)",[randomUUID(),accountId,itemId]);
    for (const cardId of cardIds) await client.query(
      `INSERT INTO cards(account_id,card_id,rarity,qty,slotted) VALUES($1,$2,'common',1,FALSE)
       ON CONFLICT(account_id,card_id,rarity) DO UPDATE SET qty=cards.qty+1`,[accountId,cardId]
    );
    await this.ensureDailyQuests(accountId,client);
    await client.query("UPDATE quests_daily SET progress=LEAST(target,progress+1),updated_at=NOW() WHERE account_id=$1 AND quest_date=CURRENT_DATE AND quest_id='hunters_duty'",[accountId]);
    if (miniBoss) await client.query("UPDATE quests_daily SET progress=LEAST(target,progress+1),updated_at=NOW() WHERE account_id=$1 AND quest_date=CURRENT_DATE AND quest_id='elite_challenge'",[accountId]);
  }

  private async ensureDailyQuests(accountId:string, client?:PoolClient): Promise<void> {
    const text = `INSERT INTO quests_daily(account_id,quest_date,quest_id,progress,target,claimed) VALUES
       ($1,CURRENT_DATE,'hunters_duty',0,30,FALSE),($1,CURRENT_DATE,'elite_challenge',0,1,FALSE),($1,CURRENT_DATE,'daily_login',1,1,FALSE)
       ON CONFLICT(account_id,quest_date,quest_id) DO NOTHING`;
    if (client) await client.query(text, [accountId]);
    else await this.database.query(text, [accountId]);
  }
}

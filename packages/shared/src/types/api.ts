import type { ItemRarity } from "../data/items.js";
import type { BattleEvent, BattleOutcome, BattleSetup } from "../combat/types.js";
import type { MapId, MonsterId } from "../data/maps.js";

export interface ApiErrorBody { readonly code: string; readonly message?: string; readonly requestId?: string; readonly retryable?: boolean; }
export interface HealthResponse {
  readonly status: "ok" | "degraded";
  readonly database: "up" | "down";
  readonly schema: "current" | "outdated" | "unknown";
  readonly version: string;
  readonly dataVersion: string;
  readonly requiredMigration: string;
  readonly timestamp: string;
}
export interface InventoryEntry { readonly id: string; readonly itemId: string; readonly rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"; readonly enhanceLevel: number; readonly equippedSlot: string | null; }
export interface QuestProgress { readonly questId: string; readonly progress: number; readonly target: number; readonly claimed: boolean; }
export interface MapNodeSummary { readonly nodeId: string; readonly mapId: MapId; readonly monsterId: MonsterId; readonly monsterName: string; readonly monsterLevel: number; readonly miniBoss: boolean; readonly recommendedLevel: number; }
export interface MapContentResponse { readonly maps: readonly { readonly mapId: MapId; readonly unlocked: boolean; readonly nodes: readonly MapNodeSummary[] }[]; }
export interface BattleRewards { readonly exp: number; readonly gold: number; readonly itemIds: readonly string[]; readonly cardIds: readonly string[]; }
export interface BattleStartResponse {
  readonly battleId: string;
  readonly nodeId: string;
  readonly monsterId: MonsterId;
  readonly monsterName: string;
  readonly outcome: BattleOutcome;
  readonly seed: number;
  readonly ticksElapsed: number;
  readonly setup: BattleSetup;
  readonly events: readonly BattleEvent[];
  readonly rewards: BattleRewards;
  readonly checksum: string;
}

export interface CardInventoryEntry { readonly cardId:string; readonly rarity:ItemRarity; readonly qty:number; readonly slotNo:number|null; }
export interface ActiveJobProgression { readonly jobId:string; readonly level:number; readonly exp:number; readonly unspentPoints:number; readonly stats:{readonly str:number;readonly dex:number;readonly con:number;readonly int:number}; }
export interface ProgressionResponse {
  readonly gold:number;
  readonly inventoryCap:number;
  readonly items:readonly InventoryEntry[];
  readonly cards:readonly CardInventoryEntry[];
  readonly activeJob:ActiveJobProgression;
}
export interface EnhancementResponse { readonly success:boolean; readonly itemId:string; readonly previousLevel:number; readonly newLevel:number; readonly goldSpent:number; readonly goldRemaining:number; readonly deduplicated:boolean; }
export interface CardMergeResponse { readonly cardId:string; readonly fromRarity:ItemRarity; readonly toRarity:ItemRarity; readonly quantityRemaining:number; readonly goldSpent:number; readonly goldRemaining:number; readonly deduplicated:boolean; }

export interface ApiErrorBody {
  readonly code: string;
  readonly message?: string;
  readonly requestId?: string;
  readonly retryable?: boolean;
}

export interface HealthResponse {
  readonly status: "ok" | "degraded";
  readonly database: "up" | "down";
  readonly version: string;
  readonly timestamp: string;
}

export interface InventoryEntry {
  readonly id: string;
  readonly itemId: string;
  readonly rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  readonly enhanceLevel: number;
  readonly equippedSlot: string | null;
}

export interface QuestProgress {
  readonly questId: string;
  readonly progress: number;
  readonly target: number;
  readonly claimed: boolean;
}

export interface BattleStartResponse {
  readonly battleId: string;
  readonly outcome: "victory" | "defeat" | "timeout";
  readonly seed: number;
  readonly ticksElapsed: number;
  readonly rewards: {
    readonly exp: number;
    readonly gold: number;
    readonly itemIds: readonly string[];
  };
  readonly checksum: string;
}

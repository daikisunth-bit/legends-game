export const STARTER_JOB_IDS = ["swordman", "mage", "archer", "healer"] as const;
export type StarterJobId = (typeof STARTER_JOB_IDS)[number];

export const TIER_2_JOB_IDS = [
  "magic_knight",
  "paladin",
  "dragoon",
  "spell_archer",
  "sage",
  "bard"
] as const;
export type Tier2JobId = (typeof TIER_2_JOB_IDS)[number];

export const TIER_3_SHADOW_IDS = [
  "tier3_shadow_crusader",
  "tier3_shadow_rune_knight",
  "tier3_shadow_elementalist",
  "tier3_shadow_saint"
] as const;
export type Tier3ShadowId = (typeof TIER_3_SHADOW_IDS)[number];

export type PlayableJobId = StarterJobId | Tier2JobId;
export type JobTreeNodeId = PlayableJobId | Tier3ShadowId;
export type JobTier = 1 | 2 | 3;

export interface JobDefinition {
  readonly id: PlayableJobId;
  readonly tier: 1 | 2;
  readonly nameKey: string;
  readonly descriptionKey: string;
  readonly baseStats: Readonly<{ str: number; dex: number; con: number; int: number }>;
}

export interface FusionRecipe {
  readonly resultJobId: Tier2JobId;
  readonly ingredientJobIds: readonly [StarterJobId, StarterJobId];
  readonly requiredLevel: 50;
}

export interface JobTreeNode {
  readonly id: JobTreeNodeId;
  readonly tier: JobTier;
  readonly unlocked: boolean;
  readonly playable: boolean;
  readonly displayMode: "revealed" | "silhouette";
  readonly nameKey: string;
  readonly hintKey?: string;
  readonly ingredientJobIds?: readonly JobTreeNodeId[];
  readonly requiredLevel?: number;
}

export function isStarterJobId(value: string): value is StarterJobId {
  return (STARTER_JOB_IDS as readonly string[]).includes(value);
}

export function isPlayableJobId(value: string): value is PlayableJobId {
  return [...STARTER_JOB_IDS, ...TIER_2_JOB_IDS].includes(value as never);
}

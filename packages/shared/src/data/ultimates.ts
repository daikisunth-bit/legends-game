import type { PlayableJobId } from "../domain/jobs.js";
import type { GoverningStat, SkillSchool, SkillTargeting } from "./skills.js";

export interface UltimateDefinition {
  readonly id: string;
  readonly jobId: PlayableJobId;
  readonly name: string;
  readonly unlockLevel: number;
  readonly school: Extract<SkillSchool, "physical" | "magic" | "heal">;
  readonly governingStat: GoverningStat;
  readonly multiplier: number;
  readonly hits: number;
  readonly targeting: SkillTargeting;
  readonly energyCost: number;
}

export const ULTIMATE_COST = 100;

export const ULTIMATES: readonly UltimateDefinition[] = [
  { id:"swordman.dragon_cleave", jobId:"swordman", name:"Dragon Cleave", unlockLevel:30, school:"physical", governingStat:"patk", multiplier:3.5, hits:1, targeting:"lowestHpEnemy", energyCost:ULTIMATE_COST },
  { id:"mage.inferno", jobId:"mage", name:"Inferno", unlockLevel:30, school:"magic", governingStat:"matK", multiplier:2.8, hits:1, targeting:"allEnemies", energyCost:ULTIMATE_COST },
  { id:"archer.storm_of_arrows", jobId:"archer", name:"Storm of Arrows", unlockLevel:30, school:"physical", governingStat:"patk", multiplier:.9, hits:5, targeting:"lowestHpEnemy", energyCost:ULTIMATE_COST },
  { id:"healer.miracle", jobId:"healer", name:"Miracle", unlockLevel:30, school:"heal", governingStat:"matK", multiplier:3, hits:1, targeting:"lowestHpAlly", energyCost:ULTIMATE_COST }
] as const;

export const ULTIMATE_BY_JOB: Readonly<Partial<Record<PlayableJobId,UltimateDefinition>>> = Object.fromEntries(
  ULTIMATES.map((ultimate) => [ultimate.jobId, ultimate])
);

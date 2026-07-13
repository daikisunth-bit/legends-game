import type { SkillDefinition } from "../data/skills.js";
import type { UltimateDefinition } from "../data/ultimates.js";
import type { PassiveDefinition } from "../data/passives.js";

export type UnitSide = "player" | "enemy";
export interface CombatStats {
  readonly maxHp:number;
  readonly patk:number;
  readonly matK:number;
  readonly def:number;
  readonly hit:number;
  readonly flee:number;
  readonly critRate:number;
  readonly critDamage:number;
  readonly spd:number;
  readonly maxEnergy:number;
  readonly energyGainMultiplier?:number;
  readonly healingDealtMultiplier?:number;
}
export interface CombatUnitSetup {
  readonly id:string;
  readonly side:UnitSide;
  readonly stats:CombatStats;
  readonly prioritySkills?:readonly SkillDefinition[];
  readonly ultimate?:UltimateDefinition;
  readonly passive?:PassiveDefinition;
}
export interface BattleSetup { readonly seed:number; readonly tickLimit:number; readonly units:readonly CombatUnitSetup[]; }
export type BattleOutcome = "victory"|"defeat"|"timeout";
export type BattleEventType =
  | "normal_attack" | "skill_cast" | "ultimate_cast" | "ultimate_ready"
  | "energy_gain" | "energy_spend" | "heal" | "miss" | "damage" | "death"
  | "effect_apply" | "effect_expire" | "dot_tick" | "hot_tick" | "cleanse" | "passive_apply";
export interface BattleEvent {
  readonly tick:number;
  readonly type:BattleEventType;
  readonly actorId:string;
  readonly targetId?:string;
  readonly skillId?:string;
  readonly effectId?:string;
  readonly amount?:number;
  readonly critical?:boolean;
  readonly energyAfter?:number;
  readonly durationTicks?:number;
  readonly reason?:"normal_attack"|"skill_cast"|"direct_hit"|"kill"|"ultimate";
}
export interface BattleResult {
  readonly outcome:BattleOutcome;
  readonly ticksElapsed:number;
  readonly events:readonly BattleEvent[];
  readonly remainingHp:Readonly<Record<string,number>>;
  readonly remainingEnergy:Readonly<Record<string,number>>;
  readonly checksum:string;
}

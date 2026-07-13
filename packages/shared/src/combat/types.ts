import type { SkillDefinition } from "../data/skills.js";
import type { UltimateDefinition } from "../data/ultimates.js";

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
}
export interface CombatUnitSetup {
  readonly id:string;
  readonly side:UnitSide;
  readonly stats:CombatStats;
  readonly prioritySkills?:readonly SkillDefinition[];
  readonly ultimate?:UltimateDefinition;
}
export interface BattleSetup { readonly seed:number; readonly tickLimit:number; readonly units:readonly CombatUnitSetup[]; }
export type BattleOutcome = "victory"|"defeat"|"timeout";
export type BattleEventType =
  | "normal_attack"
  | "skill_cast"
  | "ultimate_cast"
  | "ultimate_ready"
  | "energy_gain"
  | "energy_spend"
  | "heal"
  | "miss"
  | "damage"
  | "death";
export interface BattleEvent {
  readonly tick:number;
  readonly type:BattleEventType;
  readonly actorId:string;
  readonly targetId?:string;
  readonly skillId?:string;
  readonly amount?:number;
  readonly critical?:boolean;
  readonly energyAfter?:number;
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

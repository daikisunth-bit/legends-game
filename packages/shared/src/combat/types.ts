import type { SkillDefinition } from "../data/skills.js";

export type UnitSide = "player" | "enemy";
export interface CombatStats { readonly maxHp:number; readonly patk:number; readonly matK:number; readonly def:number; readonly hit:number; readonly flee:number; readonly critRate:number; readonly critDamage:number; readonly spd:number; readonly maxEnergy:number; }
export interface CombatUnitSetup { readonly id:string; readonly side:UnitSide; readonly stats:CombatStats; readonly prioritySkills?:readonly SkillDefinition[]; }
export interface BattleSetup { readonly seed:number; readonly tickLimit:number; readonly units:readonly CombatUnitSetup[]; }
export type BattleOutcome = "victory"|"defeat"|"timeout";
export interface BattleEvent { readonly tick:number; readonly type:"normal_attack"|"skill_cast"|"heal"|"miss"|"damage"|"death"; readonly actorId:string; readonly targetId?:string; readonly skillId?:string; readonly amount?:number; readonly critical?:boolean; }
export interface BattleResult { readonly outcome:BattleOutcome; readonly ticksElapsed:number; readonly events:readonly BattleEvent[]; readonly remainingHp:Readonly<Record<string,number>>; readonly checksum:string; }

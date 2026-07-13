import type { PlayableJobId } from "../domain/jobs.js";
import type { EffectStat } from "./skills.js";

export interface PassiveDefinition {
  readonly id:string;
  readonly jobId:PlayableJobId;
  readonly name:string;
  readonly unlockLevel:number;
  readonly statMods?:readonly {readonly stat:EffectStat;readonly percent?:number;readonly flat?:number}[];
  readonly healingDealtPct?:number;
  readonly energyGainPct?:number;
}

export const PASSIVES:readonly PassiveDefinition[]=[
  {id:"swordman.weapon_mastery",jobId:"swordman",name:"Weapon Mastery",unlockLevel:10,statMods:[{stat:"patk",percent:10}]},
  {id:"mage.arcane_mind",jobId:"mage",name:"Arcane Mind",unlockLevel:10,statMods:[{stat:"matK",percent:10}]},
  {id:"archer.eagle_eye",jobId:"archer",name:"Eagle Eye",unlockLevel:10,statMods:[{stat:"critDamage",flat:15}]},
  {id:"healer.divine_grace",jobId:"healer",name:"Divine Grace",unlockLevel:10,healingDealtPct:20}
] as const;

export const PASSIVE_BY_JOB:Readonly<Partial<Record<PlayableJobId,PassiveDefinition>>>=Object.fromEntries(PASSIVES.map((passive)=>[passive.jobId,passive]));

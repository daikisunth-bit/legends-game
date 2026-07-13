import type { PlayableJobId } from "../domain/jobs.js";

export type SkillSchool = "physical" | "magic" | "heal" | "buff" | "debuff";
export type GoverningStat = "patk" | "matK";
export type SkillTargeting = "lowestHpEnemy" | "allEnemies" | "self" | "lowestHpAlly" | "highestAtkEnemy";
export type SkillCondition =
  | { readonly kind: "always" }
  | { readonly kind: "targetCountAtLeast"; readonly value: number }
  | { readonly kind: "selfHpAtMost"; readonly value: number }
  | { readonly kind: "allyHpAtMost"; readonly value: number };

export interface SkillDefinition {
  readonly id: string;
  readonly jobId: PlayableJobId;
  readonly name: string;
  readonly unlockLevel: number;
  readonly school: SkillSchool;
  readonly governingStat: GoverningStat;
  readonly multiplier: number;
  readonly hits: number;
  readonly cooldownTicks: number;
  readonly targeting: SkillTargeting;
  readonly condition: SkillCondition;
  readonly executableInSprint: boolean;
}

const always = { kind: "always" } as const;

export const SKILLS: readonly SkillDefinition[] = [
  { id:"swordman.bash",jobId:"swordman",name:"Bash",unlockLevel:5,school:"physical",governingStat:"patk",multiplier:1.6,hits:1,cooldownTicks:30,targeting:"lowestHpEnemy",condition:always,executableInSprint:true },
  { id:"swordman.provoke",jobId:"swordman",name:"Provoke",unlockLevel:15,school:"debuff",governingStat:"patk",multiplier:0,hits:1,cooldownTicks:80,targeting:"highestAtkEnemy",condition:always,executableInSprint:false },
  { id:"swordman.sword_wave",jobId:"swordman",name:"Sword Wave",unlockLevel:25,school:"physical",governingStat:"patk",multiplier:1.1,hits:1,cooldownTicks:70,targeting:"allEnemies",condition:{kind:"targetCountAtLeast",value:2},executableInSprint:true },
  { id:"swordman.counter_stance",jobId:"swordman",name:"Counter Stance",unlockLevel:35,school:"buff",governingStat:"patk",multiplier:0,hits:1,cooldownTicks:150,targeting:"self",condition:{kind:"selfHpAtMost",value:60},executableInSprint:false },
  { id:"swordman.fatal_slash",jobId:"swordman",name:"Fatal Slash",unlockLevel:45,school:"physical",governingStat:"patk",multiplier:2.4,hits:1,cooldownTicks:100,targeting:"lowestHpEnemy",condition:always,executableInSprint:true },

  { id:"mage.fire_bolt",jobId:"mage",name:"Fire Bolt",unlockLevel:5,school:"magic",governingStat:"matK",multiplier:1.7,hits:1,cooldownTicks:30,targeting:"lowestHpEnemy",condition:always,executableInSprint:true },
  { id:"mage.ice_spike",jobId:"mage",name:"Ice Spike",unlockLevel:15,school:"magic",governingStat:"matK",multiplier:1.1,hits:1,cooldownTicks:70,targeting:"allEnemies",condition:{kind:"targetCountAtLeast",value:2},executableInSprint:true },
  { id:"mage.arcane_barrier",jobId:"mage",name:"Arcane Barrier",unlockLevel:25,school:"buff",governingStat:"matK",multiplier:0,hits:1,cooldownTicks:140,targeting:"self",condition:{kind:"selfHpAtMost",value:70},executableInSprint:false },
  { id:"mage.chain_lightning",jobId:"mage",name:"Chain Lightning",unlockLevel:35,school:"magic",governingStat:"matK",multiplier:2.7,hits:3,cooldownTicks:80,targeting:"lowestHpEnemy",condition:always,executableInSprint:true },
  { id:"mage.meteor_shard",jobId:"mage",name:"Meteor Shard",unlockLevel:45,school:"magic",governingStat:"matK",multiplier:2.6,hits:1,cooldownTicks:110,targeting:"lowestHpEnemy",condition:always,executableInSprint:true },

  { id:"archer.double_shot",jobId:"archer",name:"Double Shot",unlockLevel:5,school:"physical",governingStat:"patk",multiplier:1.7,hits:2,cooldownTicks:30,targeting:"lowestHpEnemy",condition:always,executableInSprint:true },
  { id:"archer.take_aim",jobId:"archer",name:"Take Aim",unlockLevel:15,school:"buff",governingStat:"patk",multiplier:0,hits:1,cooldownTicks:150,targeting:"self",condition:always,executableInSprint:false },
  { id:"archer.arrow_rain",jobId:"archer",name:"Arrow Rain",unlockLevel:25,school:"physical",governingStat:"patk",multiplier:1,hits:1,cooldownTicks:80,targeting:"allEnemies",condition:{kind:"targetCountAtLeast",value:2},executableInSprint:true },
  { id:"archer.piercing_arrow",jobId:"archer",name:"Piercing Arrow",unlockLevel:35,school:"physical",governingStat:"patk",multiplier:1.8,hits:1,cooldownTicks:70,targeting:"lowestHpEnemy",condition:always,executableInSprint:true },
  { id:"archer.snipe",jobId:"archer",name:"Snipe",unlockLevel:45,school:"physical",governingStat:"patk",multiplier:2.5,hits:1,cooldownTicks:110,targeting:"lowestHpEnemy",condition:always,executableInSprint:true },

  { id:"healer.holy_light",jobId:"healer",name:"Holy Light",unlockLevel:5,school:"magic",governingStat:"matK",multiplier:1.5,hits:1,cooldownTicks:30,targeting:"lowestHpEnemy",condition:always,executableInSprint:true },
  { id:"healer.heal",jobId:"healer",name:"Heal",unlockLevel:15,school:"heal",governingStat:"matK",multiplier:1.8,hits:1,cooldownTicks:50,targeting:"lowestHpAlly",condition:{kind:"allyHpAtMost",value:70},executableInSprint:true },
  { id:"healer.blessing",jobId:"healer",name:"Blessing",unlockLevel:25,school:"buff",governingStat:"matK",multiplier:0,hits:1,cooldownTicks:150,targeting:"self",condition:always,executableInSprint:false },
  { id:"healer.purify",jobId:"healer",name:"Purify",unlockLevel:35,school:"heal",governingStat:"matK",multiplier:.8,hits:1,cooldownTicks:90,targeting:"self",condition:{kind:"selfHpAtMost",value:85},executableInSprint:true },
  { id:"healer.sanctuary",jobId:"healer",name:"Sanctuary",unlockLevel:45,school:"heal",governingStat:"matK",multiplier:1.2,hits:1,cooldownTicks:120,targeting:"self",condition:{kind:"selfHpAtMost",value:50},executableInSprint:true }
] as const;

export const SKILL_BY_ID: Readonly<Record<string,SkillDefinition>> = Object.fromEntries(SKILLS.map((skill)=>[skill.id,skill]));

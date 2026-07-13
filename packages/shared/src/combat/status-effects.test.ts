import assert from "node:assert/strict";
import test from "node:test";
import { simulateBattle } from "./engine.js";
import type { CombatStats } from "./types.js";
import { SKILL_BY_ID } from "../data/skills.js";
import { PASSIVE_BY_JOB } from "../data/passives.js";

const base:CombatStats={maxHp:3000,patk:180,matK:180,def:80,hit:180,flee:20,critRate:0,critDamage:150,spd:100,maxEnergy:100,energyGainMultiplier:1};

function setup(skillId:string){
  return {seed:12345,tickLimit:600,units:[
    {id:"player",side:"player" as const,stats:base,prioritySkills:[SKILL_BY_ID[skillId]!]},
    {id:"enemy",side:"enemy" as const,stats:{...base,patk:100,matK:100,spd:60}}
  ]};
}

test("timed effects apply and expire deterministically",()=>{
  const timed={...SKILL_BY_ID["swordman.provoke"]!,id:"test.short_debuff",cooldownTicks:120,effects:[{kind:"statMod" as const,target:"target" as const,stat:"def" as const,percent:-15,durationTicks:20}]};
  const result=simulateBattle({seed:12345,tickLimit:100,units:[
    {id:"player",side:"player",stats:base,prioritySkills:[timed]},
    {id:"enemy",side:"enemy",stats:{...base,maxHp:100000,patk:40,matK:40,spd:40}}
  ]});
  assert.ok(result.events.some(event=>event.type==="effect_apply"&&event.skillId==="test.short_debuff"));
  assert.ok(result.events.some(event=>event.type==="effect_expire"&&event.skillId==="test.short_debuff"));
});

test("cleanse removes negative effects",()=>{
  const debuff={...SKILL_BY_ID["swordman.provoke"]!,jobId:"healer" as const,id:"test.debuff",targeting:"self" as const};
  const cleanse=SKILL_BY_ID["healer.purify"]!;
  const result=simulateBattle({seed:7,tickLimit:300,units:[
    {id:"player",side:"player",stats:base,prioritySkills:[debuff,cleanse]},
    {id:"enemy",side:"enemy",stats:{...base,spd:40,patk:50,matK:50}}
  ]});
  assert.ok(result.events.some(event=>event.type==="cleanse"));
});

test("passive is announced and affects combat snapshot",()=>{
  const result=simulateBattle({seed:22,tickLimit:120,units:[
    {id:"player",side:"player",stats:base,passive:PASSIVE_BY_JOB.swordman!},
    {id:"enemy",side:"enemy",stats:{...base,maxHp:5000,spd:40,patk:50,matK:50}}
  ]});
  assert.equal(result.events[0]?.type,"passive_apply");
  const firstHit=result.events.find(event=>event.type==="damage"&&event.actorId==="player");
  assert.ok((firstHit?.amount??0)>0);
});

test("same setup and seed produce the same checksum",()=>{
  const battle=setup("archer.take_aim");
  assert.equal(simulateBattle(battle).checksum,simulateBattle(battle).checksum);
});

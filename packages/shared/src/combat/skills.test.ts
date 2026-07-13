import test from "node:test";
import assert from "node:assert/strict";
import { simulateBattle } from "./engine.js";
import { SKILL_BY_ID } from "../data/skills.js";

const stats={maxHp:500,patk:100,matK:120,def:20,hit:200,flee:0,critRate:0,critDamage:150,spd:100,maxEnergy:100};
test("priority AI casts the first available skill before normal attack",()=>{
 const result=simulateBattle({seed:7,tickLimit:30,units:[
  {id:"player",side:"player",stats,prioritySkills:[SKILL_BY_ID["mage.fire_bolt"]!]},
  {id:"enemy",side:"enemy",stats:{...stats,maxHp:2000,patk:1,spd:20}}
 ]});
 const firstAction=result.events.find(event=>event.type==="skill_cast"||event.type==="normal_attack");
 assert.equal(firstAction?.type,"skill_cast");
 assert.equal(firstAction?.skillId,"mage.fire_bolt");
});

test("cooldown prevents the same skill from being cast every turn",()=>{
 const result=simulateBattle({seed:9,tickLimit:45,units:[
  {id:"player",side:"player",stats:{...stats,spd:500},prioritySkills:[SKILL_BY_ID["mage.fire_bolt"]!]},
  {id:"enemy",side:"enemy",stats:{...stats,maxHp:10000,patk:1,spd:20}}
 ]});
 const casts=result.events.filter(event=>event.type==="skill_cast");
 const normals=result.events.filter(event=>event.type==="normal_attack"&&event.actorId==="player");
 assert.ok(casts.length>=1);
 assert.ok(normals.length>=1);
});

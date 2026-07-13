import test from "node:test";
import assert from "node:assert/strict";
import { simulateBattle } from "./engine.js";
import { ULTIMATE_BY_JOB } from "../data/ultimates.js";

const base={maxHp:5000,patk:100,matK:120,def:20,hit:200,flee:0,critRate:0,critDamage:150,spd:100,maxEnergy:120,energyGainMultiplier:1};

test("normal attacks charge energy and trigger the current Job ultimate first",()=>{
  const result=simulateBattle({seed:42,tickLimit:120,units:[
    {id:"player",side:"player",stats:base,ultimate:ULTIMATE_BY_JOB.swordman!},
    {id:"enemy",side:"enemy",stats:{...base,maxHp:50000,patk:1,spd:20}}
  ]});
  const ready=result.events.find(event=>event.type==="ultimate_ready"&&event.actorId==="player");
  const cast=result.events.find(event=>event.type==="ultimate_cast"&&event.actorId==="player");
  assert.ok(ready);
  assert.equal(cast?.skillId,"swordman.dragon_cleave");
  assert.ok((cast?.energyAfter??-1)>=0);
});

test("taking a direct hit grants defender energy",()=>{
  const result=simulateBattle({seed:11,tickLimit:30,units:[
    {id:"player",side:"player",stats:{...base,spd:20,patk:1}},
    {id:"enemy",side:"enemy",stats:{...base,spd:100}}
  ]});
  const gain=result.events.find(event=>event.type==="energy_gain"&&event.actorId==="player"&&event.reason==="direct_hit");
  assert.equal(gain?.amount,8);
});

test("healer Miracle restores HP and cannot miss",()=>{
  const result=simulateBattle({seed:5,tickLimit:130,units:[
    {id:"healer",side:"player",stats:{...base,maxHp:1000,patk:1,spd:100},ultimate:ULTIMATE_BY_JOB.healer!},
    {id:"enemy",side:"enemy",stats:{...base,maxHp:10000,patk:60,spd:100}}
  ]});
  const cast=result.events.find(event=>event.type==="ultimate_cast"&&event.actorId==="healer");
  const heal=result.events.find(event=>event.type==="heal"&&event.skillId==="healer.miracle");
  assert.ok(cast);
  assert.ok((heal?.amount??0)>0);
  assert.equal(result.events.some(event=>event.type==="miss"&&event.skillId==="healer.miracle"),false);
});

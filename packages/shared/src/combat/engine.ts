import { Mulberry32 } from "./prng.js";
import type { SkillDefinition } from "../data/skills.js";
import type { UltimateDefinition } from "../data/ultimates.js";
import type { BattleEvent,BattleResult,BattleSetup,CombatUnitSetup } from "./types.js";

const GAUGE_MAX=1000;
const SPD_MIN=20;
const NORMAL_ATTACK_ENERGY=15;
const SKILL_CAST_ENERGY=10;
const DIRECT_HIT_ENERGY=8;
const KILL_ENERGY=25;

interface RuntimeUnit {
  readonly setup:CombatUnitSetup;
  hp:number;
  energy:number;
  gauge:number;
  ultimateReadyAnnounced:boolean;
  readonly cooldowns:Map<string,number>;
}

function validateSetup(setup:BattleSetup):void{
  if(!Number.isInteger(setup.tickLimit)||setup.tickLimit<=0)throw new RangeError("tickLimit must be a positive integer.");
  if(setup.units.length<2)throw new RangeError("A battle requires at least two units.");
  const ids=new Set<string>();
  for(const unit of setup.units){
    if(ids.has(unit.id))throw new Error(`Duplicate unit id: ${unit.id}`);
    ids.add(unit.id);
    if(unit.stats.maxHp<=0||unit.stats.spd<=0||unit.stats.maxEnergy<0)throw new RangeError(`Invalid stats for unit ${unit.id}.`);
  }
}

function enemies(actor:RuntimeUnit,units:readonly RuntimeUnit[]):RuntimeUnit[]{return units.filter(x=>x.hp>0&&x.setup.side!==actor.setup.side);}
function allies(actor:RuntimeUnit,units:readonly RuntimeUnit[]):RuntimeUnit[]{return units.filter(x=>x.hp>0&&x.setup.side===actor.setup.side);}
function lowestHp(list:readonly RuntimeUnit[]):RuntimeUnit|undefined{return [...list].sort((a,b)=>(a.hp/a.setup.stats.maxHp)-(b.hp/b.setup.stats.maxHp)||a.setup.id.localeCompare(b.setup.id))[0];}

function targetFor(targeting:SkillDefinition["targeting"]|UltimateDefinition["targeting"],actor:RuntimeUnit,units:readonly RuntimeUnit[]):RuntimeUnit|undefined{
  switch(targeting){
    case"self":return actor;
    case"lowestHpAlly":return lowestHp(allies(actor,units));
    case"highestAtkEnemy":return [...enemies(actor,units)].sort((a,b)=>Math.max(b.setup.stats.patk,b.setup.stats.matK)-Math.max(a.setup.stats.patk,a.setup.stats.matK))[0];
    default:return lowestHp(enemies(actor,units));
  }
}

function conditionPasses(skill:SkillDefinition,actor:RuntimeUnit,units:readonly RuntimeUnit[]):boolean{
  const c=skill.condition;
  switch(c.kind){
    case"always":return true;
    case"targetCountAtLeast":return enemies(actor,units).length>=c.value;
    case"selfHpAtMost":return actor.hp/actor.setup.stats.maxHp*100<=c.value;
    case"allyHpAtMost":return allies(actor,units).some(x=>x.hp/x.setup.stats.maxHp*100<=c.value);
  }
}

function chooseSkill(actor:RuntimeUnit,units:readonly RuntimeUnit[]):SkillDefinition|undefined{
  return actor.setup.prioritySkills?.find(skill=>skill.executableInSprint&&(actor.cooldowns.get(skill.id)??0)<=0&&conditionPasses(skill,actor,units)&&targetFor(skill.targeting,actor,units));
}

function checksum(result:Omit<BattleResult,"checksum">):string{
  const input=JSON.stringify(result);
  let hash=0x811c9dc5;
  for(let i=0;i<input.length;i++){hash^=input.charCodeAt(i);hash=Math.imul(hash,0x01000193);}
  return(hash>>>0).toString(16).padStart(8,"0");
}

function gainEnergy(unit:RuntimeUnit,base:number,tick:number,events:BattleEvent[],reason:NonNullable<BattleEvent["reason"]>):void{
  if(base<=0||unit.setup.stats.maxEnergy<=0)return;
  const multiplier=unit.setup.stats.energyGainMultiplier??1;
  const amount=Math.max(0,Math.floor(base*multiplier));
  if(amount<=0)return;
  const previous=unit.energy;
  unit.energy=Math.min(unit.setup.stats.maxEnergy,unit.energy+amount);
  const gained=unit.energy-previous;
  if(gained<=0)return;
  events.push({tick,type:"energy_gain",actorId:unit.setup.id,amount:gained,energyAfter:unit.energy,reason});
  const cost=unit.setup.ultimate?.energyCost;
  if(cost!==undefined&&previous<cost&&unit.energy>=cost&&!unit.ultimateReadyAnnounced){
    unit.ultimateReadyAnnounced=true;
    events.push({tick,type:"ultimate_ready",actorId:unit.setup.id,skillId:unit.setup.ultimate!.id,energyAfter:unit.energy});
  }
}

function spendEnergy(unit:RuntimeUnit,cost:number,tick:number,events:BattleEvent[],skillId:string):void{
  unit.energy=Math.max(0,unit.energy-cost);
  unit.ultimateReadyAnnounced=unit.energy>=cost;
  events.push({tick,type:"energy_spend",actorId:unit.setup.id,skillId,amount:cost,energyAfter:unit.energy,reason:"ultimate"});
}

function resolveHeal(actor:RuntimeUnit,target:RuntimeUnit,skillId:string,multiplier:number,hits:number,tick:number,random:Mulberry32,events:BattleEvent[]):void{
  const perHit=Math.max(0,multiplier);
  for(let hit=0;hit<Math.max(1,hits);hit++){
    const variance=.95+random.nextFloat()*.1;
    const critical=random.nextFloat()*100<actor.setup.stats.critRate;
    const raw=actor.setup.stats.matK*perHit*variance*(critical?1.3:1);
    const amount=Math.max(1,Math.floor(raw));
    target.hp=Math.min(target.setup.stats.maxHp,target.hp+amount);
    events.push({tick,type:"heal",actorId:actor.setup.id,targetId:target.setup.id,skillId,amount,critical});
  }
}

function resolveDamage(
  actor:RuntimeUnit,
  target:RuntimeUnit,
  skillId:string|undefined,
  governingStat:"patk"|"matK",
  multiplier:number,
  hits:number,
  canMiss:boolean,
  tick:number,
  random:Mulberry32,
  events:BattleEvent[]
):boolean{
  if(canMiss){
    const hitChance=Math.min(100,Math.max(50,90+(actor.setup.stats.hit-target.setup.stats.flee)*.5));
    if(random.nextFloat()*100>=hitChance){
      events.push(skillId?{tick,type:"miss",actorId:actor.setup.id,targetId:target.setup.id,skillId}:{tick,type:"miss",actorId:actor.setup.id,targetId:target.setup.id});
      return false;
    }
  }
  let landed=false;
  for(let hit=0;hit<Math.max(1,hits)&&target.hp>0;hit++){
    const attack=actor.setup.stats[governingStat];
    const mitigated=attack*multiplier*(100/(100+Math.max(0,target.setup.stats.def)));
    const variance=.95+random.nextFloat()*.1;
    const critical=random.nextFloat()*100<actor.setup.stats.critRate;
    const damage=Math.max(1,Math.floor(mitigated*variance*(critical?actor.setup.stats.critDamage/100:1)));
    target.hp=Math.max(0,target.hp-damage);
    events.push(skillId?{tick,type:"damage",actorId:actor.setup.id,targetId:target.setup.id,skillId,amount:damage,critical}:{tick,type:"damage",actorId:actor.setup.id,targetId:target.setup.id,amount:damage,critical});
    landed=true;
  }
  return landed;
}

export function simulateBattle(setup:BattleSetup):BattleResult{
  validateSetup(setup);
  const random=new Mulberry32(setup.seed);
  const units:RuntimeUnit[]=setup.units.map(setup=>({setup,hp:setup.stats.maxHp,energy:0,gauge:0,ultimateReadyAnnounced:false,cooldowns:new Map()}));
  const events:BattleEvent[]=[];
  const alive=(side:"player"|"enemy")=>units.some(x=>x.setup.side===side&&x.hp>0);
  const finish=(outcome:BattleResult["outcome"],ticksElapsed:number):BattleResult=>{
    const partial={
      outcome,
      ticksElapsed,
      events,
      remainingHp:Object.fromEntries(units.map(x=>[x.setup.id,x.hp])),
      remainingEnergy:Object.fromEntries(units.map(x=>[x.setup.id,x.energy]))
    } as const;
    return{...partial,checksum:checksum(partial)};
  };

  for(let tick=1;tick<=setup.tickLimit;tick++){
    for(const unit of units){
      if(unit.hp<=0)continue;
      unit.gauge+=Math.max(SPD_MIN,Math.floor(unit.setup.stats.spd));
      for(const [id,value] of unit.cooldowns)unit.cooldowns.set(id,Math.max(0,value-1));
    }
    const ready=units.filter(x=>x.hp>0&&x.gauge>=GAUGE_MAX).sort((a,b)=>b.gauge-a.gauge||b.setup.stats.spd-a.setup.stats.spd||(random.nextFloat()<.5?-1:1));
    for(const actor of ready){
      if(actor.hp<=0)continue;
      actor.gauge-=GAUGE_MAX;

      const ultimate=actor.setup.ultimate;
      const ultimateTarget=ultimate?targetFor(ultimate.targeting,actor,units):undefined;
      if(ultimate&&actor.energy>=ultimate.energyCost&&ultimateTarget){
        spendEnergy(actor,ultimate.energyCost,tick,events,ultimate.id);
        events.push({tick,type:"ultimate_cast",actorId:actor.setup.id,targetId:ultimateTarget.setup.id,skillId:ultimate.id,energyAfter:actor.energy});
        if(ultimate.school==="heal")resolveHeal(actor,ultimateTarget,ultimate.id,ultimate.multiplier,ultimate.hits,tick,random,events);
        else {
          const targets=ultimate.targeting==="allEnemies"?enemies(actor,units):[ultimateTarget];
          for(const target of targets){
            const wasAlive=target.hp>0;
            const landed=resolveDamage(actor,target,ultimate.id,ultimate.governingStat,ultimate.multiplier,ultimate.hits,false,tick,random,events);
            if(landed)gainEnergy(target,DIRECT_HIT_ENERGY,tick,events,"direct_hit");
            if(wasAlive&&target.hp===0){
              events.push({tick,type:"death",actorId:actor.setup.id,targetId:target.setup.id,skillId:ultimate.id});
              gainEnergy(actor,KILL_ENERGY,tick,events,"kill");
            }
          }
        }
      } else {
        const skill=chooseSkill(actor,units);
        const target=skill?targetFor(skill.targeting,actor,units):lowestHp(enemies(actor,units));
        if(!target)continue;
        if(skill){
          events.push({tick,type:"skill_cast",actorId:actor.setup.id,targetId:target.setup.id,skillId:skill.id});
          actor.cooldowns.set(skill.id,skill.cooldownTicks);
          gainEnergy(actor,SKILL_CAST_ENERGY,tick,events,"skill_cast");
        }else{
          events.push({tick,type:"normal_attack",actorId:actor.setup.id,targetId:target.setup.id});
          gainEnergy(actor,NORMAL_ATTACK_ENERGY,tick,events,"normal_attack");
        }
        if(skill?.school==="heal"){
          resolveHeal(actor,target,skill.id,skill.multiplier,skill.hits,tick,random,events);
        }else{
          const governingStat=skill?.governingStat??"patk";
          const multiplier=skill?.multiplier??1;
          const hits=skill?.hits??1;
          const wasAlive=target.hp>0;
          const landed=resolveDamage(actor,target,skill?.id,governingStat,multiplier,hits,true,tick,random,events);
          if(landed)gainEnergy(target,DIRECT_HIT_ENERGY,tick,events,"direct_hit");
          if(wasAlive&&target.hp===0){
            events.push(skill?{tick,type:"death",actorId:actor.setup.id,targetId:target.setup.id,skillId:skill.id}:{tick,type:"death",actorId:actor.setup.id,targetId:target.setup.id});
            gainEnergy(actor,KILL_ENERGY,tick,events,"kill");
          }
        }
      }

      const playerAlive=alive("player"),enemyAlive=alive("enemy");
      if(!playerAlive||!enemyAlive)return finish(playerAlive?"victory":"defeat",tick);
    }
  }
  return finish("timeout",setup.tickLimit);
}

import { Mulberry32 } from "./prng.js";
import type { PassiveDefinition } from "../data/passives.js";
import type { EffectStat, SkillDefinition, SkillEffect } from "../data/skills.js";
import type { UltimateDefinition } from "../data/ultimates.js";
import type { BattleEvent,BattleResult,BattleSetup,CombatStats,CombatUnitSetup } from "./types.js";

const GAUGE_MAX=1000;
const SPD_MIN=20;
const NORMAL_ATTACK_ENERGY=15;
const SKILL_CAST_ENERGY=10;
const DIRECT_HIT_ENERGY=8;
const KILL_ENERGY=25;
const CRIT_RATE_CAP=50;

interface RuntimeEffect {
  readonly id:string;
  readonly sourceId:string;
  readonly skillId:string;
  readonly positive:boolean;
  readonly kind:"statMod"|"dot"|"hot";
  remainingTicks:number;
  readonly stat?:EffectStat|"patk"|"matK";
  readonly percent?:number;
  readonly flat?:number;
  readonly intervalTicks?:number;
  ticksUntilPulse?:number;
  readonly multiplier?:number;
  readonly snapshotAttack?:number;
}

interface RuntimeUnit {
  readonly setup:CombatUnitSetup;
  readonly baseStats:CombatStats;
  hp:number;
  energy:number;
  gauge:number;
  ultimateReadyAnnounced:boolean;
  readonly cooldowns:Map<string,number>;
  readonly effects:Map<string,RuntimeEffect>;
}

function validateFinite(value:number,label:string):void{if(!Number.isFinite(value))throw new RangeError(`${label} must be finite.`);}
function validateSetup(setup:BattleSetup):void{
  if(!Number.isInteger(setup.seed))throw new RangeError("seed must be an integer.");
  if(!Number.isInteger(setup.tickLimit)||setup.tickLimit<=0)throw new RangeError("tickLimit must be a positive integer.");
  if(setup.units.length<2)throw new RangeError("A battle requires at least two units.");
  const ids=new Set<string>();
  for(const unit of setup.units){
    if(ids.has(unit.id))throw new Error(`Duplicate unit id: ${unit.id}`);
    ids.add(unit.id);
    for(const [key,value] of Object.entries(unit.stats))if(typeof value==="number")validateFinite(value,`${unit.id}.${key}`);
    if(unit.stats.maxHp<=0||unit.stats.spd<=0||unit.stats.maxEnergy<0)throw new RangeError(`Invalid stats for unit ${unit.id}.`);
  }
  if(!setup.units.some(x=>x.side==="player")||!setup.units.some(x=>x.side==="enemy"))throw new RangeError("Battle requires player and enemy sides.");
}

function enemies(actor:RuntimeUnit,units:readonly RuntimeUnit[]):RuntimeUnit[]{return units.filter(x=>x.hp>0&&x.setup.side!==actor.setup.side);}
function allies(actor:RuntimeUnit,units:readonly RuntimeUnit[]):RuntimeUnit[]{return units.filter(x=>x.hp>0&&x.setup.side===actor.setup.side);}
function lowestHp(list:readonly RuntimeUnit[]):RuntimeUnit|undefined{return [...list].sort((a,b)=>(a.hp/a.baseStats.maxHp)-(b.hp/b.baseStats.maxHp)||a.setup.id.localeCompare(b.setup.id))[0];}
function targetFor(targeting:SkillDefinition["targeting"]|UltimateDefinition["targeting"],actor:RuntimeUnit,units:readonly RuntimeUnit[]):RuntimeUnit|undefined{
  switch(targeting){
    case"self":return actor;
    case"lowestHpAlly":return lowestHp(allies(actor,units));
    case"highestAtkEnemy":return [...enemies(actor,units)].sort((a,b)=>Math.max(stat(b,"patk"),stat(b,"matK"))-Math.max(stat(a,"patk"),stat(a,"matK"))||a.setup.id.localeCompare(b.setup.id))[0];
    default:return lowestHp(enemies(actor,units));
  }
}
function hasDebuff(unit:RuntimeUnit):boolean{return [...unit.effects.values()].some(effect=>!effect.positive);}
function conditionPasses(skill:SkillDefinition,actor:RuntimeUnit,units:readonly RuntimeUnit[]):boolean{
  const c=skill.condition;
  switch(c.kind){
    case"always":return true;
    case"targetCountAtLeast":return enemies(actor,units).length>=c.value;
    case"selfHpAtMost":return actor.hp/actor.baseStats.maxHp*100<=c.value;
    case"allyHpAtMost":return allies(actor,units).some(x=>x.hp/x.baseStats.maxHp*100<=c.value);
    case"selfHasDebuff":return hasDebuff(actor);
  }
}
function chooseSkill(actor:RuntimeUnit,units:readonly RuntimeUnit[]):SkillDefinition|undefined{
  return actor.setup.prioritySkills?.find(skill=>skill.executableInSprint&&(actor.cooldowns.get(skill.id)??0)<=0&&conditionPasses(skill,actor,units)&&targetFor(skill.targeting,actor,units));
}

function passiveStat(passive:PassiveDefinition|undefined,key:EffectStat,base:number):number{
  const mods=passive?.statMods?.filter(mod=>mod.stat===key)??[];
  const flat=mods.reduce((sum,mod)=>sum+(mod.flat??0),0);
  const pct=mods.reduce((sum,mod)=>sum+(mod.percent??0),0);
  return (base+flat)*(1+pct/100);
}
function stat(unit:RuntimeUnit,key:EffectStat):number{
  let value=passiveStat(unit.setup.passive,key,unit.baseStats[key]);
  let flat=0,pct=0;
  for(const effect of unit.effects.values())if(effect.kind==="statMod"&&effect.stat===key){flat+=effect.flat??0;pct+=effect.percent??0;}
  value=(value+flat)*(1+pct/100);
  if(key==="spd")return Math.max(SPD_MIN,value);
  if(key==="critRate")return Math.min(CRIT_RATE_CAP,Math.max(0,value));
  if(key==="def"||key==="flee")return Math.max(0,value);
  return Math.max(1,value);
}

function checksum(result:Omit<BattleResult,"checksum">):string{
  const input=JSON.stringify(result);let hash=0x811c9dc5;
  for(let i=0;i<input.length;i++){hash^=input.charCodeAt(i);hash=Math.imul(hash,0x01000193);}return(hash>>>0).toString(16).padStart(8,"0");
}
function gainEnergy(unit:RuntimeUnit,base:number,tick:number,events:BattleEvent[],reason:NonNullable<BattleEvent["reason"]>):void{
  if(base<=0||unit.baseStats.maxEnergy<=0)return;
  const passiveGain=1+(unit.setup.passive?.energyGainPct??0)/100;
  const multiplier=(unit.baseStats.energyGainMultiplier??1)*passiveGain;
  const amount=Math.max(0,Math.floor(base*multiplier));if(amount<=0)return;
  const previous=unit.energy;unit.energy=Math.min(unit.baseStats.maxEnergy,unit.energy+amount);const gained=unit.energy-previous;if(gained<=0)return;
  events.push({tick,type:"energy_gain",actorId:unit.setup.id,amount:gained,energyAfter:unit.energy,reason});
  const cost=unit.setup.ultimate?.energyCost;
  if(cost!==undefined&&previous<cost&&unit.energy>=cost&&!unit.ultimateReadyAnnounced){unit.ultimateReadyAnnounced=true;events.push({tick,type:"ultimate_ready",actorId:unit.setup.id,skillId:unit.setup.ultimate!.id,energyAfter:unit.energy});}
}
function spendEnergy(unit:RuntimeUnit,cost:number,tick:number,events:BattleEvent[],skillId:string):void{unit.energy=Math.max(0,unit.energy-cost);unit.ultimateReadyAnnounced=unit.energy>=cost;events.push({tick,type:"energy_spend",actorId:unit.setup.id,skillId,amount:cost,energyAfter:unit.energy,reason:"ultimate"});}

function healMultiplier(actor:RuntimeUnit):number{return (actor.baseStats.healingDealtMultiplier??1)*(1+(actor.setup.passive?.healingDealtPct??0)/100);}
function applyHeal(actor:RuntimeUnit,target:RuntimeUnit,skillId:string,amount:number,tick:number,events:BattleEvent[],critical=false,type:"heal"|"hot_tick"="heal"):void{
  const actual=Math.max(0,Math.min(target.baseStats.maxHp-target.hp,amount));if(actual<=0)return;target.hp+=actual;events.push({tick,type,actorId:actor.setup.id,targetId:target.setup.id,skillId,amount:actual,critical});
}
function resolveHeal(actor:RuntimeUnit,target:RuntimeUnit,skillId:string,multiplier:number,hits:number,tick:number,random:Mulberry32,events:BattleEvent[]):void{
  for(let hit=0;hit<Math.max(1,hits);hit++){
    const variance=.95+random.nextFloat()*.1;const critical=random.nextFloat()*100<stat(actor,"critRate");
    const raw=stat(actor,"matK")*Math.max(0,multiplier)*variance*(critical?1.3:1)*healMultiplier(actor);
    applyHeal(actor,target,skillId,Math.max(1,Math.floor(raw)),tick,events,critical);
  }
}

interface DamageOptions {readonly canMiss:boolean;readonly ignoreDefPct?:number;readonly bonusCritRate?:number;}
function resolveDamage(actor:RuntimeUnit,target:RuntimeUnit,skillId:string|undefined,governingStat:"patk"|"matK",multiplier:number,hits:number,tick:number,random:Mulberry32,events:BattleEvent[],options:DamageOptions):number{
  if(options.canMiss){const hitChance=Math.min(100,Math.max(50,90+(stat(actor,"hit")-stat(target,"flee"))*.5));if(random.nextFloat()*100>=hitChance){events.push(skillId?{tick,type:"miss",actorId:actor.setup.id,targetId:target.setup.id,skillId}:{tick,type:"miss",actorId:actor.setup.id,targetId:target.setup.id});return 0;}}
  let total=0;
  for(let hit=0;hit<Math.max(1,hits)&&target.hp>0;hit++){
    const attack=stat(actor,governingStat);const effectiveDef=stat(target,"def")*(1-Math.min(100,Math.max(0,options.ignoreDefPct??0))/100);
    const mitigated=attack*multiplier*(100/(100+effectiveDef));const variance=.95+random.nextFloat()*.1;
    const critChance=Math.min(CRIT_RATE_CAP,stat(actor,"critRate")+(options.bonusCritRate??0));const critical=random.nextFloat()*100<critChance;
    const damage=Math.max(1,Math.floor(mitigated*variance*(critical?stat(actor,"critDamage")/100:1)));
    target.hp=Math.max(0,target.hp-damage);total+=damage;events.push(skillId?{tick,type:"damage",actorId:actor.setup.id,targetId:target.setup.id,skillId,amount:damage,critical}:{tick,type:"damage",actorId:actor.setup.id,targetId:target.setup.id,amount:damage,critical});
  }
  return total;
}

function effectTargets(effect:SkillEffect,actor:RuntimeUnit,primary:RuntimeUnit,units:readonly RuntimeUnit[]):RuntimeUnit[]{
  if(effect.kind==="statMod")return effect.target==="self"?[actor]:effect.target==="allEnemies"?enemies(actor,units):[primary];
  if(effect.kind==="cleanse"||effect.kind==="healFlatPct")return effect.target==="self"?[actor]:[primary];
  return[primary];
}
function upsertEffect(target:RuntimeUnit,effect:RuntimeEffect,tick:number,events:BattleEvent[]):void{
  target.effects.set(effect.id,effect);events.push({tick,type:"effect_apply",actorId:effect.sourceId,targetId:target.setup.id,skillId:effect.skillId,effectId:effect.id,durationTicks:effect.remainingTicks});
}
function cleanse(target:RuntimeUnit,actorId:string,skillId:string,tick:number,events:BattleEvent[]):void{
  let removed=0;for(const [id,effect] of target.effects)if(!effect.positive){target.effects.delete(id);removed++;events.push({tick,type:"effect_expire",actorId:actorId,targetId:target.setup.id,skillId,effectId:id});}
  events.push({tick,type:"cleanse",actorId,targetId:target.setup.id,skillId,amount:removed});
}
function applyEffects(skill:SkillDefinition,actor:RuntimeUnit,primary:RuntimeUnit,units:readonly RuntimeUnit[],damageDealt:number,tick:number,events:BattleEvent[]):void{
  for(const [index,effect] of (skill.effects??[]).entries()){
    const targets=effectTargets(effect,actor,primary,units);
    for(const target of targets){
      const id=`${skill.id}:${index}:${actor.setup.id}`;
      switch(effect.kind){
        case"statMod":upsertEffect(target,{id,sourceId:actor.setup.id,skillId:skill.id,positive:(effect.percent??0)>=0&&(effect.flat??0)>=0,kind:"statMod",remainingTicks:effect.durationTicks,stat:effect.stat,...(effect.percent!==undefined?{percent:effect.percent}:{}),...(effect.flat!==undefined?{flat:effect.flat}:{})},tick,events);break;
        case"dot":upsertEffect(target,{id,sourceId:actor.setup.id,skillId:skill.id,positive:false,kind:"dot",remainingTicks:effect.durationTicks,stat:effect.stat,intervalTicks:effect.intervalTicks,ticksUntilPulse:effect.intervalTicks,multiplier:effect.multiplier,snapshotAttack:stat(actor,effect.stat)},tick,events);break;
        case"hot":upsertEffect(target,{id,sourceId:actor.setup.id,skillId:skill.id,positive:true,kind:"hot",remainingTicks:effect.durationTicks,stat:effect.stat,intervalTicks:effect.intervalTicks,ticksUntilPulse:effect.intervalTicks,multiplier:effect.multiplier,snapshotAttack:stat(actor,"matK")},tick,events);break;
        case"cleanse":cleanse(target,actor.setup.id,skill.id,tick,events);break;
        case"healSelfPctOfDamage":applyHeal(actor,actor,skill.id,Math.floor(damageDealt*effect.percent/100),tick,events);break;
        case"healFlatPct":applyHeal(actor,target,skill.id,Math.floor(target.baseStats.maxHp*effect.percentMaxHp/100),tick,events);break;
        case"ignoreDefPct":case"bonusCritRate":break;
      }
    }
  }
}
function pulseEffects(unit:RuntimeUnit,units:readonly RuntimeUnit[],tick:number,events:BattleEvent[]):void{
  for(const [id,effect] of [...unit.effects]){
    effect.remainingTicks--;
    if(effect.kind==="dot"||effect.kind==="hot"){
      effect.ticksUntilPulse=(effect.ticksUntilPulse??1)-1;
      if(effect.ticksUntilPulse<=0&&unit.hp>0){
        effect.ticksUntilPulse=effect.intervalTicks??1;
        const source=units.find(x=>x.setup.id===effect.sourceId);
        if(effect.kind==="dot"){
          const raw=(effect.snapshotAttack??1)*(effect.multiplier??0);const amount=Math.max(1,Math.floor(raw*(100/(100+stat(unit,"def")))));unit.hp=Math.max(0,unit.hp-amount);
          events.push({tick,type:"dot_tick",actorId:effect.sourceId,targetId:unit.setup.id,skillId:effect.skillId,effectId:id,amount});
          if(unit.hp===0)events.push({tick,type:"death",actorId:effect.sourceId,targetId:unit.setup.id,skillId:effect.skillId});
        }else if(source){const amount=Math.max(1,Math.floor((effect.snapshotAttack??1)*(effect.multiplier??0)*healMultiplier(source)));applyHeal(source,unit,effect.skillId,amount,tick,events,false,"hot_tick");}
      }
    }
    if(effect.remainingTicks<=0){unit.effects.delete(id);events.push({tick,type:"effect_expire",actorId:effect.sourceId,targetId:unit.setup.id,skillId:effect.skillId,effectId:id});}
  }
}
function skillOption(skill:SkillDefinition,kind:"ignoreDefPct"|"bonusCritRate"):number|undefined{return skill.effects?.find((effect):effect is Extract<SkillEffect,{kind:typeof kind}>=>effect.kind===kind)?.percent;}

export function simulateBattle(setup:BattleSetup):BattleResult{
  validateSetup(setup);const random=new Mulberry32(setup.seed);
  const units:RuntimeUnit[]=setup.units.map(unit=>({setup:unit,baseStats:unit.stats,hp:unit.stats.maxHp,energy:0,gauge:0,ultimateReadyAnnounced:false,cooldowns:new Map(),effects:new Map()}));
  const events:BattleEvent[]=[];
  for(const unit of units)if(unit.setup.passive)events.push({tick:0,type:"passive_apply",actorId:unit.setup.id,skillId:unit.setup.passive.id});
  const alive=(side:"player"|"enemy")=>units.some(x=>x.setup.side===side&&x.hp>0);
  const finish=(outcome:BattleResult["outcome"],ticksElapsed:number):BattleResult=>{const partial={outcome,ticksElapsed,events,remainingHp:Object.fromEntries(units.map(x=>[x.setup.id,x.hp])),remainingEnergy:Object.fromEntries(units.map(x=>[x.setup.id,x.energy]))}as const;return{...partial,checksum:checksum(partial)};};

  for(let tick=1;tick<=setup.tickLimit;tick++){
    for(const unit of units){if(unit.hp<=0)continue;pulseEffects(unit,units,tick,events);for(const [id,value] of unit.cooldowns)unit.cooldowns.set(id,Math.max(0,value-1));}
    if(!alive("player")||!alive("enemy"))return finish(alive("player")?"victory":"defeat",tick);
    for(const unit of units)if(unit.hp>0)unit.gauge+=Math.floor(stat(unit,"spd"));
    const ready=units.filter(x=>x.hp>0&&x.gauge>=GAUGE_MAX).map(unit=>({unit,tie:random.nextFloat()})).sort((a,b)=>b.unit.gauge-a.unit.gauge||stat(b.unit,"spd")-stat(a.unit,"spd")||a.tie-b.tie||a.unit.setup.id.localeCompare(b.unit.setup.id)).map(entry=>entry.unit);
    for(const actor of ready){
      if(actor.hp<=0)continue;actor.gauge-=GAUGE_MAX;
      const ultimate=actor.setup.ultimate;const ultimateTarget=ultimate?targetFor(ultimate.targeting,actor,units):undefined;
      if(ultimate&&actor.energy>=ultimate.energyCost&&ultimateTarget){
        spendEnergy(actor,ultimate.energyCost,tick,events,ultimate.id);events.push({tick,type:"ultimate_cast",actorId:actor.setup.id,targetId:ultimateTarget.setup.id,skillId:ultimate.id,energyAfter:actor.energy});
        if(ultimate.school==="heal")resolveHeal(actor,ultimateTarget,ultimate.id,ultimate.multiplier,ultimate.hits,tick,random,events);
        else for(const target of ultimate.targeting==="allEnemies"?enemies(actor,units):[ultimateTarget]){const wasAlive=target.hp>0;const dealt=resolveDamage(actor,target,ultimate.id,ultimate.governingStat,ultimate.multiplier,ultimate.hits,tick,random,events,{canMiss:false});if(dealt>0)gainEnergy(target,DIRECT_HIT_ENERGY,tick,events,"direct_hit");if(wasAlive&&target.hp===0){events.push({tick,type:"death",actorId:actor.setup.id,targetId:target.setup.id,skillId:ultimate.id});gainEnergy(actor,KILL_ENERGY,tick,events,"kill");}}
      }else{
        const skill=chooseSkill(actor,units);const primary=skill?targetFor(skill.targeting,actor,units):lowestHp(enemies(actor,units));if(!primary)continue;
        if(skill){events.push({tick,type:"skill_cast",actorId:actor.setup.id,targetId:primary.setup.id,skillId:skill.id});actor.cooldowns.set(skill.id,skill.cooldownTicks);gainEnergy(actor,SKILL_CAST_ENERGY,tick,events,"skill_cast");}
        else{events.push({tick,type:"normal_attack",actorId:actor.setup.id,targetId:primary.setup.id});gainEnergy(actor,NORMAL_ATTACK_ENERGY,tick,events,"normal_attack");}
        let damageDealt=0;
        if(skill?.school==="heal")resolveHeal(actor,primary,skill.id,skill.multiplier,skill.hits,tick,random,events);
        else if(skill?.school==="buff"||skill?.school==="debuff"){/* effect-only action */}
        else{
          const targets=skill?.targeting==="allEnemies"?enemies(actor,units):[primary];
          for(const target of targets){const wasAlive=target.hp>0;const ignoreDefPct=skill?skillOption(skill,"ignoreDefPct"):undefined;const bonusCritRate=skill?skillOption(skill,"bonusCritRate"):undefined;const dealt=resolveDamage(actor,target,skill?.id,skill?.governingStat??"patk",skill?.multiplier??1,skill?.hits??1,tick,random,events,{canMiss:true,...(ignoreDefPct!==undefined?{ignoreDefPct}:{}),...(bonusCritRate!==undefined?{bonusCritRate}:{})});damageDealt+=dealt;if(dealt>0)gainEnergy(target,DIRECT_HIT_ENERGY,tick,events,"direct_hit");if(wasAlive&&target.hp===0){events.push(skill?{tick,type:"death",actorId:actor.setup.id,targetId:target.setup.id,skillId:skill.id}:{tick,type:"death",actorId:actor.setup.id,targetId:target.setup.id});gainEnergy(actor,KILL_ENERGY,tick,events,"kill");}}
        }
        if(skill)applyEffects(skill,actor,primary,units,damageDealt,tick,events);
      }
      if(!alive("player")||!alive("enemy"))return finish(alive("player")?"victory":"defeat",tick);
    }
  }
  return finish("timeout",setup.tickLimit);
}

import type { BattleStartResponse, MapNodeSummary } from "@loce/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/client.js";

const sleep = (ms:number):Promise<void> => new Promise((resolve)=>window.setTimeout(resolve,ms));
function formatEvent(event:BattleStartResponse["events"][number]):string {
  const actor=event.actorId.startsWith("player")?"คุณ":"ศัตรู";
  switch(event.type){
    case"damage":return `Tick ${event.tick}: ${actor} ทำความเสียหาย ${event.amount ?? 0}${event.critical?" CRIT!":""}`;
    case"heal":return `Tick ${event.tick}: ${actor} ฟื้นฟู ${event.amount ?? 0}${event.critical?" CRIT HEAL!":""}`;
    case"energy_gain":return `Tick ${event.tick}: ${actor} ได้ Energy +${event.amount ?? 0} (${event.energyAfter ?? 0})`;
    case"ultimate_ready":return `Tick ${event.tick}: Ultimate ของ ${actor} พร้อมใช้`;
    case"ultimate_cast":return `Tick ${event.tick}: ${actor} ใช้ Ultimate ${event.skillId ?? ""}`;
    case"effect_apply":return `Tick ${event.tick}: ${event.skillId ?? "Effect"} เริ่มทำงาน (${event.durationTicks ?? 0} ticks)`;
    case"effect_expire":return `Tick ${event.tick}: ${event.effectId ?? "Effect"} สิ้นสุด`;
    case"dot_tick":return `Tick ${event.tick}: ${event.skillId ?? "DoT"} ทำความเสียหายต่อเนื่อง ${event.amount ?? 0}`;
    case"hot_tick":return `Tick ${event.tick}: ${event.skillId ?? "HoT"} ฟื้นฟูต่อเนื่อง ${event.amount ?? 0}`;
    case"cleanse":return `Tick ${event.tick}: ${actor} ล้างสถานะลบ ${event.amount ?? 0} รายการ`;
    case"passive_apply":return `เริ่มการต่อสู้: Passive ${event.skillId ?? ""} ทำงาน`;
    default:return `Tick ${event.tick}: ${event.type}`;
  }
}


export function BattleScreen({ node, onExit }:{ node:MapNodeSummary; onExit:()=>void }):React.JSX.Element {
  const [result,setResult] = useState<BattleStartResponse|null>(null);
  const [busy,setBusy] = useState(false);
  const [auto,setAuto] = useState(false);
  const [error,setError] = useState<string|null>(null);
  const stopRef = useRef(false);
  const autoRef = useRef(false);
  autoRef.current = auto;

  const latestEvents = useMemo(()=>result?.events.filter((event)=>["damage","heal","energy_gain","ultimate_ready","ultimate_cast","effect_apply","effect_expire","dot_tick","hot_tick","cleanse","passive_apply"].includes(event.type)).slice(-10) ?? [],[result]);
  const playerId = result?.setup.units.find((unit)=>unit.side==="player")?.id;
  const playerEnergy = playerId ? (result?.events.filter((event)=>event.actorId===playerId&&event.energyAfter!==undefined).at(-1)?.energyAfter ?? 0) : 0;
  const playerMaxEnergy = result?.setup.units.find((unit)=>unit.side==="player")?.stats.maxEnergy ?? 100;

  async function runBattle():Promise<void>{
    if(busy)return;
    setBusy(true); setError(null); stopRef.current=false;
    try{
      const response = await api.request<BattleStartResponse>("/battle/start",{method:"POST",body:JSON.stringify({nodeId:node.nodeId,idempotencyKey:crypto.randomUUID()})},45_000);
      setResult(response);
      await api.request("/battle/ack",{method:"POST",body:JSON.stringify({battleId:response.battleId})});
      if(autoRef.current && response.outcome==="victory" && !stopRef.current && !document.hidden){
        await sleep(1600);
        if(autoRef.current && !stopRef.current) void runBattle();
      } else if(response.outcome!=="victory") setAuto(false);
    }catch(e){ setAuto(false); setError(e instanceof Error?e.message:"error.unknown"); }
    finally{ setBusy(false); }
  }

  useEffect(()=>{ void runBattle(); return()=>{stopRef.current=true;}; },[]);
  useEffect(()=>{ const onVisibility=()=>{if(document.hidden){stopRef.current=true;setAuto(false);}};document.addEventListener("visibilitychange",onVisibility);return()=>document.removeEventListener("visibilitychange",onVisibility);},[]);

  return <main className="battle-screen">
    <header className="battle-header"><button onClick={()=>{stopRef.current=true;setAuto(false);onExit();}}>← กลับเมือง</button><div><strong>{node.monsterName}</strong><span>Lv.{node.monsterLevel}</span></div></header>
    <section className="battle-stage">
      <div className="combatant player-combatant"><div className="sprite-orb">⚔️</div><strong>ผู้เล่น</strong></div>
      <div className="versus">VS</div>
      <div className="combatant enemy-combatant"><div className="sprite-orb">{node.miniBoss?"🐺":"👾"}</div><strong>{node.monsterName}</strong></div>
      {busy && <div className="battle-loading">กำลังให้เซิร์ฟเวอร์จำลองการต่อสู้...</div>}
    </section>
    <section className="battle-panel parchment">
      {error && <p className="error-text">เชื่อมต่อไม่สำเร็จ: {error}</p>}
      {!result && !error && <p>กำลังเริ่มการต่อสู้ 1 ต่อ 1</p>}
      {result && <>
        <h2 className={result.outcome==="victory"?"victory":"defeat"}>{result.outcome==="victory"?"ชัยชนะ":"พ่ายแพ้"}</h2>
        <p>เวลา {(result.ticksElapsed/10).toFixed(1)} วินาที · Seed {result.seed}</p>
        <div className="energy-summary"><strong>Energy {playerEnergy}/{Math.floor(playerMaxEnergy)}</strong><div className="energy-track"><span style={{width:`${Math.min(100,(playerEnergy/playerMaxEnergy)*100)}%`}} /></div></div>
        <div className="reward-grid"><span>EXP +{result.rewards.exp}</span><span>Gold +{result.rewards.gold}</span><span>Item {result.rewards.itemIds.length}</span><span>Card {result.rewards.cardIds.length}</span></div>
        <div className="battle-log">{latestEvents.map((event,index)=><small key={`${event.tick}-${index}`}>{formatEvent(event)}</small>)}</div>
      </>}
      <div className="battle-actions"><button className="primary" disabled={busy} onClick={()=>void runBattle()}>{busy?"กำลังต่อสู้...":"สู้อีกครั้ง"}</button><label><input type="checkbox" checked={auto} onChange={(event)=>{stopRef.current=!event.target.checked;setAuto(event.target.checked);if(event.target.checked&&!busy)void runBattle();}}/> ต่อสู้อัตโนมัติ</label><button className="secondary" onClick={()=>{stopRef.current=true;setAuto(false);}}>หยุดออโต้</button></div>
    </section>
  </main>;
}

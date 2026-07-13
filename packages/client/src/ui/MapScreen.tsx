import type { MapContentResponse, MapNodeSummary } from "@loce/shared";
import { useEffect, useState } from "react";
import { api } from "../api/client.js";
export function MapScreen({onSelect,onBack}:{onSelect:(node:MapNodeSummary)=>void;onBack:()=>void}):React.JSX.Element{
 const [content,setContent]=useState<MapContentResponse|null>(null); const [error,setError]=useState<string|null>(null);
 useEffect(()=>{void api.request<MapContentResponse>("/maps").then(setContent).catch((e)=>setError(e instanceof Error?e.message:"error"));},[]);
 return <main className="map-screen"><header className="map-header"><button onClick={onBack}>← เมือง</button><div><h1>World Map</h1><p>เลือกมอนสเตอร์เพื่อเริ่ม Battle แบบ 1 ต่อ 1</p></div></header>
 {error&&<p className="error-text">โหลดแผนที่ไม่สำเร็จ: {error}</p>}
 {!content?<div className="loading">กำลังโหลดแผนที่...</div>:<div className="map-list">{content.maps.map((map)=><section key={map.mapId} className={map.unlocked?"map-region":"map-region locked"}><h2>{map.mapId.toUpperCase()}</h2><p>{map.unlocked?"เปิดใช้งานแล้ว":"ยังไม่ปลดล็อก"}</p><div className="node-grid">{map.nodes.map((node)=><button key={node.nodeId} disabled={!map.unlocked} className={node.miniBoss?"monster-node mini-boss":"monster-node"} onClick={()=>onSelect(node)}><span className="monster-icon">{node.miniBoss?"👑":"⚔"}</span><strong>{node.monsterName}</strong><small>Lv.{node.monsterLevel}</small><small>{node.miniBoss?"Mini-boss":"1 vs 1"}</small></button>)}</div></section>)}</div>}
 </main>;
}

import { STARTER_JOB_IDS, type StarterJobId } from "@loce/shared";
import { useState } from "react";
import { api } from "../api/client.js";
const LABELS: Readonly<Record<StarterJobId, { name: string; role: string; mark: string }>> = {
  swordman: { name: "Swordman", role: "นักรบกายภาพที่สมดุล", mark: "⚔" }, mage: { name: "Mage", role: "จอมเวทโจมตีรุนแรง", mark: "✦" }, archer: { name: "Archer", role: "นักยิงธนูรวดเร็วและคริติคอล", mark: "➹" }, healer: { name: "Healer", role: "ผู้ใช้เวทรักษาและสนับสนุน", mark: "✚" }
};
export function StarterJobSelection({ onComplete }: { onComplete: () => void }): React.JSX.Element {
  const [selected, setSelected] = useState<StarterJobId | null>(null); const [busy, setBusy] = useState(false);
  async function confirm(): Promise<void> { if (!selected) return; setBusy(true); try { await api.request("/onboarding/select-starter-job", { method: "POST", body: JSON.stringify({ jobId: selected }) }); onComplete(); } finally { setBusy(false); } }
  return <main className="screen"><section className="parchment panel wide" aria-labelledby="starter-title"><p className="eyebrow">เส้นทางแรกของคุณ</p><h1 id="starter-title">เลือกอาชีพเริ่มต้น</h1><p>เลือกได้ 1 อาชีพก่อนเริ่มการผจญภัย คุณสามารถปลดล็อกและสลับอาชีพอื่นได้ฟรีเมื่ออยู่ในเมือง</p><div className="job-grid">{STARTER_JOB_IDS.map((jobId) => <button key={jobId} type="button" className={selected === jobId ? "job-card selected" : "job-card"} onClick={() => setSelected(jobId)} aria-pressed={selected === jobId}><span className={`job-sigil ${jobId}`}>{LABELS[jobId].mark}</span><strong>{LABELS[jobId].name}</strong><small>{LABELS[jobId].role}</small></button>)}</div><button className="primary" type="button" onClick={() => void confirm()} disabled={!selected || busy}>{busy ? "กำลังบันทึก..." : "เริ่มต้นการผจญภัย"}</button></section></main>;
}

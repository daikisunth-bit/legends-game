import type { BackendState } from "../hooks/useBackendStatus.js";

const titles: Record<Exclude<BackendState, "online">, string> = {
  checking: "กำลังตรวจสอบเซิร์ฟเวอร์...",
  waking: "กำลังปลุกเซิร์ฟเวอร์ฟรี...",
  offline: "ยังเชื่อมต่อเซิร์ฟเวอร์ไม่ได้",
  database: "ฐานข้อมูลยังไม่พร้อม",
  migration: "ฐานข้อมูลต้องอัปเดต"
};

export function BackendStatus({ state, details, onRetry }: { state: BackendState; details: string | null; onRetry: () => void }): React.JSX.Element | null {
  if (state === "online") return null;
  return (
    <aside className={`backend-banner backend-${state}`} role="status" aria-live="polite">
      <div>
        <strong>{titles[state]}</strong>
        <span>{details ?? "Render Free Tier อาจใช้เวลา 30–90 วินาทีในการเริ่มทำงาน"}</span>
      </div>
      <button type="button" onClick={onRetry}>ลองเชื่อมต่อใหม่</button>
    </aside>
  );
}

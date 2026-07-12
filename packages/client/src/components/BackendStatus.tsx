import type { BackendState } from "../hooks/useBackendStatus.js";
export function BackendStatus({ state, onRetry }: { state: BackendState; onRetry: () => void }): React.JSX.Element | null {
  if (state === "online") return null;
  const text = state === "offline" ? "เซิร์ฟเวอร์หรือฐานข้อมูลยังไม่พร้อม" : "กำลังปลุกเซิร์ฟเวอร์ฟรี อาจใช้เวลาสักครู่...";
  return <aside className="backend-banner" role="status"><span>{text}</span>{state === "offline" && <button onClick={onRetry}>ลองใหม่</button>}</aside>;
}

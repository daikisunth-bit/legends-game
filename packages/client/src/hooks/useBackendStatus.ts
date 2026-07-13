import { useCallback, useEffect, useRef, useState } from "react";
import type { HealthResponse } from "@loce/shared";
import { api } from "../api/client.js";

export type BackendState = "checking" | "online" | "waking" | "offline" | "database" | "migration";

interface BackendStatusResult {
  readonly state: BackendState;
  readonly retry: () => void;
  readonly details: string | null;
}

const MAX_DELAY_MS = 60_000;

export function useBackendStatus(): BackendStatusResult {
  const [state, setState] = useState<BackendState>("checking");
  const [details, setDetails] = useState<string | null>(null);
  const attemptRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const check = useCallback(async () => {
    clearTimer();
    if (!navigator.onLine) {
      setState("offline");
      setDetails("อุปกรณ์ไม่ได้เชื่อมต่ออินเทอร์เน็ต");
      return;
    }
    setState((current) => current === "checking" ? "checking" : "waking");
    try {
      const health = await api.request<HealthResponse>("/health", {}, 20_000);
      if (health.database !== "up") {
        setState("database");
        setDetails("ฐานข้อมูลยังไม่พร้อมใช้งาน");
      } else if (health.schema !== "current") {
        setState("migration");
        setDetails(`ฐานข้อมูลต้องอัปเดต ${health.requiredMigration}`);
      } else {
        attemptRef.current = 0;
        setState("online");
        setDetails(null);
        timerRef.current = window.setTimeout(() => void check(), 60_000);
        return;
      }
    } catch {
      setState("offline");
      setDetails("Backend อาจกำลัง Cold Start หรือไม่พร้อมใช้งาน");
    }
    attemptRef.current += 1;
    const delay = Math.min(5_000 * 2 ** Math.min(attemptRef.current - 1, 4), MAX_DELAY_MS);
    timerRef.current = window.setTimeout(() => void check(), delay);
  }, [clearTimer]);

  useEffect(() => {
    const onOnline = (): void => { attemptRef.current = 0; void check(); };
    const onOffline = (): void => { clearTimer(); setState("offline"); setDetails("อุปกรณ์ไม่ได้เชื่อมต่ออินเทอร์เน็ต"); };
    const onVisibility = (): void => { if (document.visibilityState === "visible") void check(); };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisibility);
    void check();
    return () => {
      clearTimer();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [check, clearTimer]);

  return { state, retry: () => { attemptRef.current = 0; void check(); }, details };
}

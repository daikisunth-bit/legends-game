import { useCallback, useEffect, useState } from "react";
import type { HealthResponse } from "@loce/shared";
import { api } from "../api/client.js";

export type BackendState = "checking" | "online" | "waking" | "offline";
export function useBackendStatus(): { state: BackendState; retry: () => void } {
  const [state, setState] = useState<BackendState>("checking");
  const check = useCallback(() => {
    setState((current) => current === "offline" ? "checking" : "waking");
    void api.request<HealthResponse>("/health", {}, 12_000)
      .then((health) => setState(health.database === "up" ? "online" : "offline"))
      .catch(() => setState("offline"));
  }, []);
  useEffect(() => { check(); const timer = window.setInterval(check, 30_000); return () => window.clearInterval(timer); }, [check]);
  return { state, retry: check };
}

import { useCallback, useEffect, useState } from "react";
import { api } from "./api/client.js";
import type { Bootstrap } from "./app/types.js";
import { AuthScreen } from "./ui/AuthScreen.js";
import { StarterJobSelection } from "./ui/StarterJobSelection.js";
import { TownScreen } from "./ui/TownScreen.js";
import { BackendStatus } from "./components/BackendStatus.js";
import { useBackendStatus } from "./hooks/useBackendStatus.js";

export function App(): React.JSX.Element {
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(Boolean(localStorage.getItem("loce.accessToken")));
  const backend = useBackendStatus();

  const refresh = useCallback(async () => {
    if (!authenticated) { setLoading(false); return; }
    setLoading(true);
    try { setBootstrap(await api.request<Bootstrap>("/me", {}, 45_000)); }
    catch (error) {
      if (error instanceof Error && error.message.startsWith("error.auth")) {
        api.setToken(null); setAuthenticated(false); setBootstrap(null);
      }
    } finally { setLoading(false); }
  }, [authenticated]);

  useEffect(() => { void refresh(); }, [refresh]);
  const content = loading
    ? <main className="screen"><div className="loading">กำลังโหลดโลก...</div></main>
    : !authenticated
      ? <AuthScreen onAuthenticated={() => setAuthenticated(true)} />
      : !bootstrap?.starterJobSelected
        ? <StarterJobSelection onComplete={() => void refresh()} />
        : <TownScreen bootstrap={bootstrap} onRefresh={() => void refresh()} onLogout={() => { api.setToken(null); setAuthenticated(false); setBootstrap(null); }} />;

  return <><BackendStatus state={backend.state} onRetry={backend.retry} />{content}</>;
}

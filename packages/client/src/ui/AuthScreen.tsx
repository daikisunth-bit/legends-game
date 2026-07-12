import { useState } from "react";
import { api } from "../api/client.js";
import type { AuthResponse } from "../app/types.js";

export function AuthScreen({ onAuthenticated }: { onAuthenticated: () => void }): React.JSX.Element {
  const [mode, setMode] = useState<"login" | "register">("register");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = mode === "register" ? { username, displayName, password, inviteCode } : { username, password };
      const response = await api.request<AuthResponse>(`/auth/${mode}`, { method: "POST", body: JSON.stringify(body) }, 45_000);
      api.setToken(response.accessToken);
      onAuthenticated();
    } catch (error) {
      setError(error instanceof Error ? error.message : "error.unknown");
    } finally { setBusy(false); }
  }

  return <main className="screen auth-screen"><section className="parchment panel">
    <p className="eyebrow">Legends of Class Evolution</p>
    <h1>{mode === "register" ? "สร้างบัญชีนักผจญภัย" : "เข้าสู่ระบบ"}</h1>
    <form onSubmit={(event) => void submit(event)} className="form-stack">
      <label>Username<input value={username} onChange={(event) => setUsername(event.target.value)} minLength={3} required /></label>
      {mode === "register" && <label>ชื่อตัวละคร<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={2} required /></label>}
      <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required /></label>
      {mode === "register" && <label>Invite Code<input value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} required /></label>}
      {error && <p className="error-text">{error}</p>}
      <button className="primary" disabled={busy}>{busy ? "กำลังเชื่อมต่อ..." : mode === "register" ? "สร้างบัญชี" : "เข้าสู่ระบบ"}</button>
    </form>
    <button className="text-button" onClick={() => setMode(mode === "register" ? "login" : "register")}>{mode === "register" ? "มีบัญชีแล้ว — เข้าสู่ระบบ" : "ยังไม่มีบัญชี — สมัครใหม่"}</button>
  </section></main>;
}

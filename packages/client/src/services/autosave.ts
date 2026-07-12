import { api } from "../api/client.js";

interface SaveChanges { tutorialFlags?: Record<string, boolean>; settings?: { language?: "th" | "en"; autoRepeat?: boolean; autoUseScroll?: boolean }; }
class AutosaveService {
  private timer: number | null = null;
  private pending: SaveChanges = {};
  private version = Number(localStorage.getItem("loce.saveVersion") ?? "0");
  queue(changes: SaveChanges): void {
    this.pending = { tutorialFlags: { ...this.pending.tutorialFlags, ...changes.tutorialFlags }, settings: { ...this.pending.settings, ...changes.settings } };
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => void this.flush(), 1500);
  }
  async flush(): Promise<boolean> {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
    if (Object.keys(this.pending).length === 0) return true;
    const changes = this.pending;
    const nextVersion = this.version + 1;
    const idempotencyKey = crypto.randomUUID();
    try {
      await api.request("/save/batch", { method: "POST", body: JSON.stringify({ version: nextVersion, idempotencyKey, changes }) });
      this.version = nextVersion;
      localStorage.setItem("loce.saveVersion", String(nextVersion));
      this.pending = {};
      return true;
    } catch {
      this.pending = changes;
      window.setTimeout(() => void this.flush(), 5000);
      return false;
    }
  }
}
export const autosave = new AutosaveService();

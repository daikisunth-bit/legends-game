import { api } from "../api/client.js";

interface SaveChanges {
  tutorialFlags?: Record<string, boolean>;
  settings?: { language?: "th" | "en"; autoRepeat?: boolean; autoUseScroll?: boolean };
}
interface PendingBatch {
  readonly version: number;
  readonly idempotencyKey: string;
  readonly changes: SaveChanges;
}

const STORAGE_KEY = "loce.pendingSave";

class AutosaveService {
  private timer: number | null = null;
  private queued: SaveChanges = {};
  private inFlight: PendingBatch | null = this.restorePending();
  private version = Number(localStorage.getItem("loce.saveVersion") ?? "0");
  private retryAttempt = 0;

  constructor() {
    window.addEventListener("online", () => void this.flush());
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void this.flush();
    });
  }

  queue(changes: SaveChanges): void {
    this.queued = this.merge(this.queued, changes);
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => void this.flush(), 1_500);
  }

  async flush(): Promise<boolean> {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
    if (!navigator.onLine) return false;

    if (!this.inFlight && Object.keys(this.queued).length > 0) {
      this.inFlight = {
        version: this.version + 1,
        idempotencyKey: crypto.randomUUID(),
        changes: this.queued
      };
      this.queued = {};
      this.persistPending(this.inFlight);
    }
    if (!this.inFlight) return true;

    const batch = this.inFlight;
    try {
      await api.request("/save/batch", {
        method: "POST",
        body: JSON.stringify(batch)
      });
      this.version = batch.version;
      localStorage.setItem("loce.saveVersion", String(this.version));
      this.inFlight = null;
      localStorage.removeItem(STORAGE_KEY);
      this.retryAttempt = 0;
      if (Object.keys(this.queued).length > 0) this.timer = window.setTimeout(() => void this.flush(), 250);
      return true;
    } catch {
      this.retryAttempt += 1;
      const delay = Math.min(5_000 * 2 ** Math.min(this.retryAttempt - 1, 5), 120_000);
      this.timer = window.setTimeout(() => void this.flush(), delay);
      return false;
    }
  }

  private merge(base: SaveChanges, next: SaveChanges): SaveChanges {
    return {
      tutorialFlags: { ...base.tutorialFlags, ...next.tutorialFlags },
      settings: { ...base.settings, ...next.settings }
    };
  }

  private persistPending(batch: PendingBatch): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(batch));
  }

  private restorePending(): PendingBatch | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) as PendingBatch : null;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }
}

export const autosave = new AutosaveService();

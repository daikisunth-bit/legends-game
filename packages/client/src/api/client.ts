import type { ApiErrorBody } from "@loce/shared";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
export class ApiError extends Error {
  constructor(readonly code: string, readonly status: number, readonly retryable: boolean) { super(code); }
}
export class ApiClient {
  constructor(private token: string | null = localStorage.getItem("loce.accessToken")) {}
  setToken(token: string | null): void {
    this.token = token;
    if (token) localStorage.setItem("loce.accessToken", token);
    else localStorage.removeItem("loce.accessToken");
  }
  getToken(): string | null { return this.token; }
  async request<T>(path: string, init: RequestInit = {}, timeoutMs = 20_000): Promise<T> {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${API_URL}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
          ...init.headers
        }
      });
      const body = await response.json().catch(() => ({ code: "error.invalidResponse", retryable: true })) as T & ApiErrorBody;
      if (!response.ok) throw new ApiError(body.code ?? "error.unknown", response.status, body.retryable ?? response.status >= 500);
      return body;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError("error.network.backendUnavailable", 0, true);
    } finally { window.clearTimeout(timeout); }
  }
}
export const api = new ApiClient();

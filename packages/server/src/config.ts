import { z } from "zod";

const booleanString = z.enum(["true", "false"]).transform((value) => value === "true");
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("15m"),
  CLIENT_ORIGINS: z.string().default("http://localhost:5173"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(20).default(5),
  RATE_LIMIT_MAX: z.coerce.number().int().min(10).default(100),
  RATE_LIMIT_WINDOW: z.string().default("1 minute"),
  ENABLE_REGISTRATION: booleanString.default("true"),
  INVITE_CODE: z.string().min(1),
  BATTLE_HISTORY_RETENTION_DAYS: z.coerce.number().int().min(1).default(7),
  PVP_HISTORY_RETENTION_DAYS: z.coerce.number().int().min(1).default(30),
  MAIL_RETENTION_DAYS: z.coerce.number().int().min(1).default(30)
});

export type ApiConfig = z.infer<typeof schema> & { readonly clientOrigins: readonly string[] };
export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const parsed = schema.parse(env);
  return { ...parsed, clientOrigins: parsed.CLIENT_ORIGINS.split(",").map((value) => value.trim()).filter(Boolean) };
}

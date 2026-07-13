import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { ZodError } from "zod";
import type { ApiConfig } from "./config.js";
import { Database } from "./infrastructure/database.js";
import { AccountRepository } from "./infrastructure/account-repository.js";
import { AuthService } from "./application/auth-service.js";
import { JobTreeService } from "./application/job-tree-service.js";
import { registerAuthRoutes } from "./routes/auth-routes.js";
import { registerAccountRoutes } from "./routes/account-routes.js";
import { registerGameRoutes } from "./routes/game-routes.js";
import { GameService } from "./services/game-service.js";
import { ProgressionService } from "./services/progression-service.js";
import { SkillService } from "./services/skill-service.js";
import { AppError } from "./domain/errors.js";
import { readSchemaStatus } from "./infrastructure/schema-status.js";
import { APP_VERSION, DATA_VERSION, REQUIRED_SCHEMA_MIGRATION } from "@loce/shared";

declare module "fastify" { interface FastifyInstance { authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>; } }
declare module "@fastify/jwt" { interface FastifyJWT { payload: { sub: string }; user: { sub: string }; } }

export async function buildApp(config: ApiConfig): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: config.LOG_LEVEL }, trustProxy: true, requestIdHeader: "x-request-id" });
  const database = new Database(config.DATABASE_URL, config.DB_POOL_MAX);
  const accounts = new AccountRepository(database.pool);
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin(origin, callback) {
      if (!origin || config.clientOrigins.includes(origin)) callback(null, true);
      else callback(new Error("Origin not allowed"), false);
    },
    credentials: true
  });
  await app.register(rateLimit, { max: config.RATE_LIMIT_MAX, timeWindow: config.RATE_LIMIT_WINDOW });
  await app.register(jwt, { secret: config.JWT_SECRET, sign: { expiresIn: config.JWT_EXPIRES_IN } });
  app.decorate("authenticate", async function (request: FastifyRequest): Promise<void> { await request.jwtVerify(); });
  app.addHook("onClose", async () => database.close());
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) return reply.code(error.statusCode).send({ code: error.code, requestId: request.id, retryable: error.retryable });
    if (error instanceof ZodError) return reply.code(400).send({ code: "error.validation.invalidPayload", requestId: request.id, issues: error.issues });
    if ((error as { statusCode?: number }).statusCode === 429) return reply.code(429).send({ code: "error.rateLimit", requestId: request.id, retryable: true });
    request.log.error({ err: error }, "unhandled request error");
    return reply.code(500).send({ code: "error.internal", requestId: request.id, retryable: true });
  });
  app.get("/health/live", async () => ({ status: "ok", version: APP_VERSION, timestamp: new Date().toISOString() }));
  app.get("/health", async () => {
    const databaseUp = await database.healthCheck();
    const schemaStatus = databaseUp
      ? await readSchemaStatus(database.pool, REQUIRED_SCHEMA_MIGRATION)
      : { current: false, latestApplied: null };
    const ready = databaseUp && schemaStatus.current;
    return {
      status: ready ? "ok" : "degraded",
      database: databaseUp ? "up" : "down",
      schema: databaseUp ? (schemaStatus.current ? "current" : "outdated") : "unknown",
      version: APP_VERSION,
      dataVersion: DATA_VERSION,
      requiredMigration: REQUIRED_SCHEMA_MIGRATION,
      timestamp: new Date().toISOString()
    };
  });
  app.get("/health/ready", async (_request, reply) => {
    const databaseUp = await database.healthCheck();
    const schemaStatus = databaseUp
      ? await readSchemaStatus(database.pool, REQUIRED_SCHEMA_MIGRATION)
      : { current: false, latestApplied: null };
    if (!databaseUp || !schemaStatus.current) reply.code(503);
    return {
      status: databaseUp && schemaStatus.current ? "ok" : "degraded",
      database: databaseUp ? "up" : "down",
      schema: databaseUp ? (schemaStatus.current ? "current" : "outdated") : "unknown",
      requiredMigration: REQUIRED_SCHEMA_MIGRATION,
      timestamp: new Date().toISOString()
    };
  });
  app.get("/data/version", async () => ({ dataVersion: DATA_VERSION, appVersion: APP_VERSION }));
  await registerAuthRoutes(app, new AuthService(database, accounts, config.ENABLE_REGISTRATION, config.INVITE_CODE));
  await registerAccountRoutes(app, database, accounts, new JobTreeService());
  const skills = new SkillService(database);
  await registerGameRoutes(app, database, new GameService(database, skills), new ProgressionService(database), skills);
  return app;
}

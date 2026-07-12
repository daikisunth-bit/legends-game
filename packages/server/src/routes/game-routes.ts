import type { FastifyInstance, FastifyRequest } from "fastify";
import { autosaveSchema, battleStartSchema } from "@loce/shared";
import type { Database } from "../infrastructure/database.js";
import type { GameService } from "../services/game-service.js";

const accountId = (request: FastifyRequest): string => request.user.sub;
export async function registerGameRoutes(app: FastifyInstance, database: Database, game: GameService): Promise<void> {
  app.get("/inventory", { onRequest: [app.authenticate] }, (request) => game.inventory(accountId(request)));
  app.get("/quests/daily", { onRequest: [app.authenticate] }, (request) => game.quests(accountId(request)));
  app.post("/battle/start", { onRequest: [app.authenticate], config: { rateLimit: { max: 12, timeWindow: "1 minute" } } }, async (request) => {
    const input = battleStartSchema.parse(request.body);
    return game.startBattle(accountId(request), input.nodeId, input.idempotencyKey);
  });
  app.post("/save/batch", { onRequest: [app.authenticate], config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, async (request) => {
    const input = autosaveSchema.parse(request.body);
    const id = accountId(request);
    return database.transaction(async (client) => {
      const prior = await client.query("SELECT 1 FROM request_deduplication WHERE account_id=$1 AND idempotency_key=$2", [id, input.idempotencyKey]);
      if (prior.rowCount) return { saved: true, deduplicated: true, version: input.version };
      await client.query(
        "UPDATE account_state SET tutorial_flags=tutorial_flags || $2::jsonb, settings=settings || $3::jsonb, save_version=GREATEST(save_version,$4), updated_at=NOW() WHERE account_id=$1",
        [id, JSON.stringify(input.changes.tutorialFlags ?? {}), JSON.stringify(input.changes.settings ?? {}), input.version]
      );
      await client.query("INSERT INTO request_deduplication(account_id,idempotency_key,route,response) VALUES($1,$2,'/save/batch',$3)", [id, input.idempotencyKey, JSON.stringify({ saved: true, version: input.version })]);
      return { saved: true, deduplicated: false, version: input.version };
    });
  });
}

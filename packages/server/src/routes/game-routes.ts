import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  allocateStatsSchema, autosaveSchema, battleAckSchema, battleStartSchema, equipItemSchema,
  enhanceItemSchema, mergeCardSchema, saveSkillLoadoutSchema, slotCardSchema, unequipItemSchema, unslotCardSchema
} from "@loce/shared";
import type { Database } from "../infrastructure/database.js";
import type { GameService } from "../services/game-service.js";
import type { ProgressionService } from "../services/progression-service.js";
import type { SkillService } from "../services/skill-service.js";
const accountId=(request:FastifyRequest):string=>request.user.sub;
export async function registerGameRoutes(app:FastifyInstance,database:Database,game:GameService,progression:ProgressionService,skills:SkillService):Promise<void>{
  app.get("/maps",{onRequest:[app.authenticate]},request=>game.mapContent(accountId(request)));
  app.get("/inventory",{onRequest:[app.authenticate]},request=>game.inventory(accountId(request)));
  app.get("/progression",{onRequest:[app.authenticate]},request=>progression.snapshot(accountId(request)));
  app.get("/skills/loadout",{onRequest:[app.authenticate]},request=>skills.get(accountId(request)));
  app.post("/skills/loadout",{onRequest:[app.authenticate]},request=>{const input=saveSkillLoadoutSchema.parse(request.body);return skills.save(accountId(request),input.slots);});
  app.get("/quests/daily",{onRequest:[app.authenticate]},request=>game.quests(accountId(request)));
  app.post("/items/equip",{onRequest:[app.authenticate]},request=>{const input=equipItemSchema.parse(request.body);return progression.equip(accountId(request),input.itemDbId);});
  app.post("/items/unequip",{onRequest:[app.authenticate]},request=>{const input=unequipItemSchema.parse(request.body);return progression.unequip(accountId(request),input.slot);});
  app.post("/items/enhance",{onRequest:[app.authenticate],config:{rateLimit:{max:30,timeWindow:"1 minute"}}},request=>{const input=enhanceItemSchema.parse(request.body);return progression.enhance(accountId(request),input.itemDbId,input.idempotencyKey);});
  app.post("/jobs/allocate",{onRequest:[app.authenticate]},request=>{const input=allocateStatsSchema.parse(request.body);return progression.allocate(accountId(request),input);});
  app.post("/cards/slot",{onRequest:[app.authenticate]},request=>{const input=slotCardSchema.parse(request.body);return progression.slotCard(accountId(request),input.slotNo,input.cardId,input.rarity);});
  app.post("/cards/unslot",{onRequest:[app.authenticate]},request=>{const input=unslotCardSchema.parse(request.body);return progression.unslotCard(accountId(request),input.slotNo);});
  app.post("/cards/merge",{onRequest:[app.authenticate]},request=>{const input=mergeCardSchema.parse(request.body);return progression.mergeCard(accountId(request),input.cardId,input.rarity,input.idempotencyKey);});
  app.post("/battle/start",{onRequest:[app.authenticate],config:{rateLimit:{max:12,timeWindow:"1 minute"}}},async request=>{const input=battleStartSchema.parse(request.body);return game.startBattle(accountId(request),input.nodeId,input.idempotencyKey);});
  app.post("/battle/ack",{onRequest:[app.authenticate]},async request=>{const input=battleAckSchema.parse(request.body);return game.acknowledgeBattle(accountId(request),input.battleId);});
  app.post("/save/batch",{onRequest:[app.authenticate],config:{rateLimit:{max:20,timeWindow:"1 minute"}}},async request=>{const input=autosaveSchema.parse(request.body);const id=accountId(request);return database.transaction(async client=>{const prior=await client.query("SELECT 1 FROM request_deduplication WHERE account_id=$1 AND idempotency_key=$2",[id,input.idempotencyKey]);if(prior.rowCount)return{saved:true,deduplicated:true,version:input.version};await client.query("UPDATE account_state SET tutorial_flags=tutorial_flags || $2::jsonb,settings=settings || $3::jsonb,save_version=GREATEST(save_version,$4),updated_at=NOW() WHERE account_id=$1",[id,JSON.stringify(input.changes.tutorialFlags??{}),JSON.stringify(input.changes.settings??{}),input.version]);await client.query("INSERT INTO request_deduplication(account_id,idempotency_key,route,response) VALUES($1,$2,'/save/batch',$3)",[id,input.idempotencyKey,JSON.stringify({saved:true,version:input.version})]);return{saved:true,deduplicated:false,version:input.version};});});
}

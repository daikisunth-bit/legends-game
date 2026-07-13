import { randomInt, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import {
  CARDS,
  CARD_MERGE_FEES,
  ENHANCEMENT_COSTS,
  ENHANCEMENT_SUCCESS,
  ITEMS,
  nextCardRarity,
  type CardMergeResponse,
  type EnhancementResponse,
  type EquipmentSlot,
  type ItemRarity,
  type ProgressionResponse
} from "@loce/shared";
import type { Database } from "../infrastructure/database.js";
import { AppError } from "../domain/errors.js";

interface ItemRow { id:string; item_id:string; rarity:ItemRarity; enhance_level:number; equipped_slot:EquipmentSlot|null; }

export class ProgressionService {
  constructor(private readonly database:Database) {}

  async snapshot(accountId:string):Promise<ProgressionResponse>{
    const state=await this.database.query<{gold:string;inventory_cap:number;current_job_id:string}>("SELECT gold,inventory_cap,current_job_id FROM account_state WHERE account_id=$1",[accountId]);
    const current=state.rows[0]; if(!current?.current_job_id) throw new AppError("error.progression.noActiveJob",409);
    const [items,cards,job]=await Promise.all([
      this.database.query<ItemRow>("SELECT id,item_id,rarity,enhance_level,equipped_slot FROM items WHERE account_id=$1 ORDER BY created_at DESC LIMIT 300",[accountId]),
      this.database.query<{card_id:string;rarity:ItemRarity;qty:number;slot_no:number|null}>(`SELECT c.card_id,c.rarity,c.qty,s.slot_no FROM cards c LEFT JOIN card_slots s ON s.account_id=c.account_id AND s.card_id=c.card_id AND s.rarity=c.rarity WHERE c.account_id=$1 AND c.qty>0 ORDER BY c.card_id,c.rarity`,[accountId]),
      this.database.query<{job_id:string;level:number;exp:string;unspent_points:number;stat_str:number;stat_dex:number;stat_con:number;stat_int:number}>("SELECT job_id,level,exp,unspent_points,stat_str,stat_dex,stat_con,stat_int FROM jobs WHERE account_id=$1 AND job_id=$2",[accountId,current.current_job_id])
    ]);
    const j=job.rows[0]; if(!j) throw new AppError("error.progression.jobNotFound",404);
    return {gold:Number(current.gold),inventoryCap:current.inventory_cap,items:items.rows.map(r=>({id:r.id,itemId:r.item_id,rarity:r.rarity,enhanceLevel:r.enhance_level,equippedSlot:r.equipped_slot})),cards:cards.rows.map(r=>({cardId:r.card_id,rarity:r.rarity,qty:r.qty,slotNo:r.slot_no})),activeJob:{jobId:j.job_id,level:j.level,exp:Number(j.exp),unspentPoints:j.unspent_points,stats:{str:j.stat_str,dex:j.stat_dex,con:j.stat_con,int:j.stat_int}}};
  }

  async equip(accountId:string,itemDbId:string):Promise<{equipped:true;slot:EquipmentSlot}>{
    return this.database.transaction(async client=>{
      const result=await client.query<ItemRow>("SELECT id,item_id,rarity,enhance_level,equipped_slot FROM items WHERE id=$1 AND account_id=$2 FOR UPDATE",[itemDbId,accountId]);
      const item=result.rows[0]; const def=item?ITEMS[item.item_id]:undefined; if(!item||!def) throw new AppError("error.items.notFound",404);
      await client.query("UPDATE items SET equipped_slot=NULL WHERE account_id=$1 AND equipped_slot=$2",[accountId,def.slot]);
      await client.query("UPDATE items SET equipped_slot=$3 WHERE id=$1 AND account_id=$2",[itemDbId,accountId,def.slot]);
      return {equipped:true,slot:def.slot};
    });
  }

  async unequip(accountId:string,slot:EquipmentSlot):Promise<{unequipped:true}>{await this.database.query("UPDATE items SET equipped_slot=NULL WHERE account_id=$1 AND equipped_slot=$2",[accountId,slot]);return{unequipped:true};}

  async enhance(accountId:string,itemDbId:string,key:string):Promise<EnhancementResponse>{
    return this.database.transaction(async client=>{
      const prior=await this.dedup<EnhancementResponse>(client,accountId,key); if(prior)return{...prior,deduplicated:true};
      const itemResult=await client.query<ItemRow>("SELECT id,item_id,rarity,enhance_level,equipped_slot FROM items WHERE id=$1 AND account_id=$2 FOR UPDATE",[itemDbId,accountId]);
      const item=itemResult.rows[0]; if(!item||!ITEMS[item.item_id]) throw new AppError("error.items.notFound",404); if(item.enhance_level>=10) throw new AppError("error.enhance.maxLevel",409);
      const target=item.enhance_level+1,cost=ENHANCEMENT_COSTS[target]!,chance=ENHANCEMENT_SUCCESS[target]!;
      const state=await client.query<{gold:string}>("SELECT gold FROM account_state WHERE account_id=$1 FOR UPDATE",[accountId]); const gold=Number(state.rows[0]?.gold??0); if(gold<cost) throw new AppError("error.currency.insufficientGold",409);
      const success=randomInt(1,101)<=chance,newLevel=success?target:item.enhance_level,newGold=gold-cost;
      await client.query("UPDATE account_state SET gold=$2,updated_at=NOW() WHERE account_id=$1",[accountId,newGold]);
      if(success)await client.query("UPDATE items SET enhance_level=$2 WHERE id=$1",[itemDbId,newLevel]);
      await client.query("INSERT INTO transactions(id,account_id,currency,delta,balance_after,reason,ref_id,source) VALUES($1,$2,'gold',$3,$4,'equipment_enhancement',$5,'game')",[randomUUID(),accountId,-cost,newGold,itemDbId]);
      const response:EnhancementResponse={success,itemId:itemDbId,previousLevel:item.enhance_level,newLevel,goldSpent:cost,goldRemaining:newGold,deduplicated:false}; await this.storeDedup(client,accountId,key,"/items/enhance",response); return response;
    });
  }

  async allocate(accountId:string,input:{str:number;dex:number;con:number;int:number}):Promise<{saved:true;unspentPoints:number}>{
    return this.database.transaction(async client=>{
      const state=await client.query<{current_job_id:string}>("SELECT current_job_id FROM account_state WHERE account_id=$1 FOR UPDATE",[accountId]); const jobId=state.rows[0]?.current_job_id;if(!jobId)throw new AppError("error.progression.noActiveJob",409);
      const job=await client.query<{level:number}>("SELECT level FROM jobs WHERE account_id=$1 AND job_id=$2 FOR UPDATE",[accountId,jobId]); const level=job.rows[0]?.level;if(!level)throw new AppError("error.progression.jobNotFound",404);
      const total=input.str+input.dex+input.con+input.int,allowed=4*(level-1); if(total>allowed)throw new AppError("error.stats.tooManyPoints",409); const unspent=allowed-total;
      await client.query("UPDATE jobs SET stat_str=$3,stat_dex=$4,stat_con=$5,stat_int=$6,unspent_points=$7 WHERE account_id=$1 AND job_id=$2",[accountId,jobId,input.str,input.dex,input.con,input.int,unspent]); return{saved:true,unspentPoints:unspent};
    });
  }

  async slotCard(accountId:string,slotNo:number,cardId:string,rarity:ItemRarity):Promise<{slotted:true}>{
    if(!CARDS[cardId])throw new AppError("error.cards.unknown",404);
    return this.database.transaction(async client=>{const owned=await client.query("SELECT 1 FROM cards WHERE account_id=$1 AND card_id=$2 AND rarity=$3 AND qty>0 FOR UPDATE",[accountId,cardId,rarity]);if(!owned.rowCount)throw new AppError("error.cards.notOwned",404);await client.query("DELETE FROM card_slots WHERE account_id=$1 AND (slot_no=$2 OR card_id=$3)",[accountId,slotNo,cardId]);await client.query("INSERT INTO card_slots(account_id,slot_no,card_id,rarity) VALUES($1,$2,$3,$4)",[accountId,slotNo,cardId,rarity]);return{slotted:true};});
  }
  async unslotCard(accountId:string,slotNo:number):Promise<{unslotted:true}>{await this.database.query("DELETE FROM card_slots WHERE account_id=$1 AND slot_no=$2",[accountId,slotNo]);return{unslotted:true};}

  async mergeCard(accountId:string,cardId:string,rarity:ItemRarity,key:string):Promise<CardMergeResponse>{
    const next=nextCardRarity(rarity);if(!next)throw new AppError("error.cards.maxRarity",409);if(!CARDS[cardId])throw new AppError("error.cards.unknown",404);
    return this.database.transaction(async client=>{const prior=await this.dedup<CardMergeResponse>(client,accountId,key);if(prior)return{...prior,deduplicated:true};const card=await client.query<{qty:number}>("SELECT qty FROM cards WHERE account_id=$1 AND card_id=$2 AND rarity=$3 FOR UPDATE",[accountId,cardId,rarity]);const qty=card.rows[0]?.qty??0;if(qty<3)throw new AppError("error.cards.insufficientCopies",409);const fee=CARD_MERGE_FEES[next];const state=await client.query<{gold:string}>("SELECT gold FROM account_state WHERE account_id=$1 FOR UPDATE",[accountId]);const gold=Number(state.rows[0]?.gold??0);if(gold<fee)throw new AppError("error.currency.insufficientGold",409);await client.query("DELETE FROM card_slots WHERE account_id=$1 AND card_id=$2",[accountId,cardId]);await client.query("UPDATE cards SET qty=qty-3 WHERE account_id=$1 AND card_id=$2 AND rarity=$3",[accountId,cardId,rarity]);await client.query("INSERT INTO cards(account_id,card_id,rarity,qty,slotted) VALUES($1,$2,$3,1,FALSE) ON CONFLICT(account_id,card_id,rarity) DO UPDATE SET qty=cards.qty+1",[accountId,cardId,next]);const remaining=qty-3,newGold=gold-fee;await client.query("UPDATE account_state SET gold=$2,updated_at=NOW() WHERE account_id=$1",[accountId,newGold]);await client.query("INSERT INTO transactions(id,account_id,currency,delta,balance_after,reason,ref_id,source) VALUES($1,$2,'gold',$3,$4,'card_merge',$5,'game')",[randomUUID(),accountId,-fee,newGold,`${cardId}:${rarity}`]);const response:CardMergeResponse={cardId,fromRarity:rarity,toRarity:next,quantityRemaining:remaining,goldSpent:fee,goldRemaining:newGold,deduplicated:false};await this.storeDedup(client,accountId,key,"/cards/merge",response);return response;});
  }

  private async dedup<T>(client:PoolClient,accountId:string,key:string):Promise<T|null>{const r=await client.query<{response:T}>("SELECT response FROM request_deduplication WHERE account_id=$1 AND idempotency_key=$2 FOR UPDATE",[accountId,key]);return r.rows[0]?.response??null;}
  private async storeDedup(client:PoolClient,accountId:string,key:string,route:string,response:unknown):Promise<void>{await client.query("INSERT INTO request_deduplication(account_id,idempotency_key,route,response) VALUES($1,$2,$3,$4)",[accountId,key,route,JSON.stringify(response)]);}
}

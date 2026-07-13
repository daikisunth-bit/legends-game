export type EquipmentSlot = "weapon" | "helmet" | "armor" | "pants" | "shoes" | "gloves";
export type ItemRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type NumericStat = "patk" | "matk" | "maxHp" | "def" | "spd" | "critRate";

export interface ItemDefinition {
  readonly id: string;
  readonly name: string;
  readonly slot: EquipmentSlot;
  readonly setId?: "squire" | "wildhunt";
  readonly baseStats: Readonly<Partial<Record<NumericStat, number>>>;
}

export const RARITY_MULTIPLIER: Readonly<Record<ItemRarity, number>> = {
  common: 1,
  uncommon: 1.2,
  rare: 1.5,
  epic: 1.9,
  legendary: 2.4
};

export const ENHANCEMENT_COSTS = [0,100,200,400,800,1500,2500,4000,6000,9000,15000] as const;
export const ENHANCEMENT_SUCCESS = [0,100,100,95,90,80,70,60,50,40,30] as const;

export const ITEMS: Readonly<Record<string, ItemDefinition>> = {
  training_sword:{id:"training_sword",name:"Training Sword",slot:"weapon",baseStats:{patk:12}},
  apprentice_staff:{id:"apprentice_staff",name:"Apprentice Staff",slot:"weapon",baseStats:{matk:12}},
  short_bow:{id:"short_bow",name:"Short Bow",slot:"weapon",baseStats:{patk:10,spd:3}},
  oak_rod:{id:"oak_rod",name:"Oak Rod",slot:"weapon",baseStats:{matk:10,maxHp:40}},
  knights_blade:{id:"knights_blade",name:"Knight's Blade",slot:"weapon",baseStats:{patk:26}},
  runed_staff:{id:"runed_staff",name:"Runed Staff",slot:"weapon",baseStats:{matk:26}},
  hunters_longbow:{id:"hunters_longbow",name:"Hunter's Longbow",slot:"weapon",baseStats:{patk:22,critRate:2}},
  frostbrand:{id:"frostbrand",name:"Frostbrand",slot:"weapon",baseStats:{patk:40,matk:12}},
  squire_helm:{id:"squire_helm",name:"Squire's Helm",slot:"helmet",setId:"squire",baseStats:{def:5,maxHp:35}},
  squire_armor:{id:"squire_armor",name:"Squire's Armor",slot:"armor",setId:"squire",baseStats:{def:8,maxHp:60}},
  squire_pants:{id:"squire_pants",name:"Squire's Pants",slot:"pants",setId:"squire",baseStats:{def:6,maxHp:45}},
  squire_shoes:{id:"squire_shoes",name:"Squire's Shoes",slot:"shoes",setId:"squire",baseStats:{def:4,spd:2}},
  squire_gloves:{id:"squire_gloves",name:"Squire's Gloves",slot:"gloves",setId:"squire",baseStats:{def:4,maxHp:30}},
  squire_buckler:{id:"squire_buckler",name:"Squire's Buckler",slot:"weapon",setId:"squire",baseStats:{patk:8,def:6}},
  wildhunt_helm:{id:"wildhunt_helm",name:"Wildhunt Helm",slot:"helmet",setId:"wildhunt",baseStats:{def:10,maxHp:80}},
  wildhunt_armor:{id:"wildhunt_armor",name:"Wildhunt Armor",slot:"armor",setId:"wildhunt",baseStats:{def:16,maxHp:140}},
  wildhunt_pants:{id:"wildhunt_pants",name:"Wildhunt Pants",slot:"pants",setId:"wildhunt",baseStats:{def:13,maxHp:110}},
  wildhunt_shoes:{id:"wildhunt_shoes",name:"Wildhunt Shoes",slot:"shoes",setId:"wildhunt",baseStats:{def:10,spd:5}},
  wildhunt_gloves:{id:"wildhunt_gloves",name:"Wildhunt Gloves",slot:"gloves",setId:"wildhunt",baseStats:{def:10,critRate:2}},
  wildhunt_warbow:{id:"wildhunt_warbow",name:"Wildhunt Warbow",slot:"weapon",setId:"wildhunt",baseStats:{patk:30}}
};

export function finalItemStats(itemId:string, rarity:ItemRarity, enhanceLevel:number): Partial<Record<NumericStat,number>> {
  const item=ITEMS[itemId]; if(!item) return {};
  const rarityMult=RARITY_MULTIPLIER[rarity];
  const enhanceMult=1+0.05*Math.max(0,Math.min(10,enhanceLevel));
  return Object.fromEntries(Object.entries(item.baseStats).map(([key,value])=>[key,Math.floor(Number(value)*rarityMult)*enhanceMult])) as Partial<Record<NumericStat,number>>;
}

import type { CombatStats } from "../combat/types.js";

export type MapId = "map1" | "map2" | "map3" | "map4";
export type MonsterId =
  | "green_slime" | "fluffbit" | "wild_boar" | "sporeling" | "plains_wolf" | "alpha_direwolf"
  | "forest_spider" | "poison_toad" | "treant_sapling" | "hornet" | "bandit_scout" | "elder_treant"
  | "canyon_vulture" | "rock_golem" | "fire_imp" | "sand_scorpion" | "canyon_raider" | "magma_golem"
  | "frost_wolf" | "ice_elemental" | "yeti_youngling" | "harpy" | "frost_revenant" | "frost_wyrm";

export interface DropDefinition {
  readonly itemId: string;
  readonly chance: number;
}
export interface MonsterDefinition {
  readonly id: MonsterId;
  readonly mapId: MapId;
  readonly displayName: string;
  readonly level: number;
  readonly miniBoss: boolean;
  readonly stats: CombatStats;
  readonly exp: number;
  readonly goldMin: number;
  readonly goldMax: number;
  readonly cardDropChance: number;
  readonly equipmentDrops: readonly DropDefinition[];
}
export interface BattleNodeDefinition {
  readonly id: string;
  readonly mapId: MapId;
  readonly monsterId: MonsterId;
  readonly recommendedLevel: number;
}

const stats = (maxHp: number, patk: number, def: number, hit: number, flee: number, spd: number): CombatStats => ({
  maxHp, patk, matK: patk, def, hit, flee, critRate: 5, critDamage: 150, spd, maxEnergy: 100
});

export const MONSTERS: Readonly<Record<MonsterId, MonsterDefinition>> = {
  green_slime: { id:"green_slime", mapId:"map1", displayName:"Green Slime", level:1, miniBoss:false, stats:stats(260,24,6,82,2,76), exp:38, goldMin:8, goldMax:12, cardDropChance:.01, equipmentDrops:[{itemId:"training_sword",chance:.018},{itemId:"apprentice_staff",chance:.018}] },
  fluffbit: { id:"fluffbit", mapId:"map1", displayName:"Fluffbit", level:3, miniBoss:false, stats:stats(310,27,8,86,4,92), exp:43, goldMin:9, goldMax:14, cardDropChance:.01, equipmentDrops:[{itemId:"oak_rod",chance:.022}] },
  wild_boar: { id:"wild_boar", mapId:"map1", displayName:"Wild Boar", level:5, miniBoss:false, stats:stats(390,34,11,90,5,86), exp:49, goldMin:11, goldMax:17, cardDropChance:.01, equipmentDrops:[{itemId:"training_sword",chance:.025}] },
  sporeling: { id:"sporeling", mapId:"map1", displayName:"Sporeling", level:7, miniBoss:false, stats:stats(360,38,10,94,7,82), exp:54, goldMin:12, goldMax:19, cardDropChance:.01, equipmentDrops:[{itemId:"apprentice_staff",chance:.025}] },
  plains_wolf: { id:"plains_wolf", mapId:"map1", displayName:"Plains Wolf", level:9, miniBoss:false, stats:stats(440,43,13,98,10,108), exp:60, goldMin:14, goldMax:22, cardDropChance:.01, equipmentDrops:[{itemId:"short_bow",chance:.03}] },
  alpha_direwolf: { id:"alpha_direwolf", mapId:"map1", displayName:"Alpha Direwolf", level:12, miniBoss:true, stats:stats(980,62,24,108,14,112), exp:150, goldMin:65, goldMax:90, cardDropChance:.05, equipmentDrops:[{itemId:"squires_helm",chance:.12},{itemId:"squires_armor",chance:.08}] },
  forest_spider: { id:"forest_spider", mapId:"map2", displayName:"Forest Spider", level:15, miniBoss:false, stats:stats(720,66,25,112,18,115), exp:78, goldMin:20, goldMax:30, cardDropChance:.01, equipmentDrops:[] },
  poison_toad: { id:"poison_toad", mapId:"map2", displayName:"Poison Toad", level:18, miniBoss:false, stats:stats(840,71,32,116,12,88), exp:86, goldMin:22, goldMax:33, cardDropChance:.01, equipmentDrops:[] },
  treant_sapling: { id:"treant_sapling", mapId:"map2", displayName:"Treant Sapling", level:21, miniBoss:false, stats:stats(1040,76,40,120,10,74), exp:95, goldMin:25, goldMax:37, cardDropChance:.01, equipmentDrops:[] },
  hornet: { id:"hornet", mapId:"map2", displayName:"Hornet", level:24, miniBoss:false, stats:stats(760,84,28,126,23,132), exp:104, goldMin:27, goldMax:41, cardDropChance:.01, equipmentDrops:[] },
  bandit_scout: { id:"bandit_scout", mapId:"map2", displayName:"Bandit Scout", level:27, miniBoss:false, stats:stats(920,91,34,132,25,120), exp:114, goldMin:30, goldMax:46, cardDropChance:.01, equipmentDrops:[] },
  elder_treant: { id:"elder_treant", mapId:"map2", displayName:"Elder Treant", level:30, miniBoss:true, stats:stats(2350,122,70,140,20,82), exp:320, goldMin:150, goldMax:210, cardDropChance:.05, equipmentDrops:[] },
  canyon_vulture: { id:"canyon_vulture", mapId:"map3", displayName:"Canyon Vulture", level:34, miniBoss:false, stats:stats(1450,132,62,148,34,140), exp:150, goldMin:42, goldMax:60, cardDropChance:.01, equipmentDrops:[] },
  rock_golem: { id:"rock_golem", mapId:"map3", displayName:"Rock Golem", level:38, miniBoss:false, stats:stats(2200,140,105,150,18,72), exp:170, goldMin:48, goldMax:68, cardDropChance:.01, equipmentDrops:[] },
  fire_imp: { id:"fire_imp", mapId:"map3", displayName:"Fire Imp", level:42, miniBoss:false, stats:stats(1600,158,68,158,36,128), exp:190, goldMin:54, goldMax:76, cardDropChance:.01, equipmentDrops:[] },
  sand_scorpion: { id:"sand_scorpion", mapId:"map3", displayName:"Sand Scorpion", level:46, miniBoss:false, stats:stats(1900,166,86,162,30,104), exp:212, goldMin:60, goldMax:84, cardDropChance:.01, equipmentDrops:[] },
  canyon_raider: { id:"canyon_raider", mapId:"map3", displayName:"Canyon Raider", level:50, miniBoss:false, stats:stats(2050,182,78,170,42,122), exp:236, goldMin:66, goldMax:92, cardDropChance:.01, equipmentDrops:[] },
  magma_golem: { id:"magma_golem", mapId:"map3", displayName:"Magma Golem", level:55, miniBoss:true, stats:stats(5200,245,155,180,28,80), exp:720, goldMin:330, goldMax:450, cardDropChance:.05, equipmentDrops:[] },
  frost_wolf: { id:"frost_wolf", mapId:"map4", displayName:"Frost Wolf", level:60, miniBoss:false, stats:stats(3000,250,115,188,52,150), exp:310, goldMin:82, goldMax:112, cardDropChance:.01, equipmentDrops:[] },
  ice_elemental: { id:"ice_elemental", mapId:"map4", displayName:"Ice Elemental", level:66, miniBoss:false, stats:stats(3400,275,126,194,48,124), exp:350, goldMin:90, goldMax:124, cardDropChance:.01, equipmentDrops:[] },
  yeti_youngling: { id:"yeti_youngling", mapId:"map4", displayName:"Yeti Youngling", level:72, miniBoss:false, stats:stats(4300,295,145,198,42,96), exp:395, goldMin:100, goldMax:136, cardDropChance:.01, equipmentDrops:[] },
  harpy: { id:"harpy", mapId:"map4", displayName:"Harpy", level:78, miniBoss:false, stats:stats(3550,325,122,208,62,158), exp:445, goldMin:112, goldMax:152, cardDropChance:.01, equipmentDrops:[] },
  frost_revenant: { id:"frost_revenant", mapId:"map4", displayName:"Frost Revenant", level:84, miniBoss:false, stats:stats(4600,350,165,214,50,116), exp:505, goldMin:126, goldMax:170, cardDropChance:.01, equipmentDrops:[] },
  frost_wyrm: { id:"frost_wyrm", mapId:"map4", displayName:"Frost Wyrm", level:90, miniBoss:true, stats:stats(11800,470,250,230,56,128), exp:1600, goldMin:720, goldMax:980, cardDropChance:.05, equipmentDrops:[] }
};

export const BATTLE_NODES: readonly BattleNodeDefinition[] = Object.values(MONSTERS).map((monster) => ({
  id: `${monster.mapId}.${monster.id}`,
  mapId: monster.mapId,
  monsterId: monster.id,
  recommendedLevel: monster.level
}));

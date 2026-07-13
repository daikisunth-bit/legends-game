import assert from "node:assert/strict";
import test from "node:test";
import { finalItemStats } from "./items.js";
import { nextCardRarity } from "./cards.js";

test("equipment stats apply rarity before enhancement",()=>{
  const stats=finalItemStats("knights_blade","rare",5);
  assert.equal(stats.patk,48.75);
});
test("card rarity progression stops at legendary",()=>{
  assert.equal(nextCardRarity("common"),"uncommon");
  assert.equal(nextCardRarity("legendary"),null);
});

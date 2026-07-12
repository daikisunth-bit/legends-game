import test from "node:test";
import assert from "node:assert/strict";
import { simulateBattle } from "./engine.js";
import type { BattleSetup } from "./types.js";

const setup: BattleSetup = {
  seed: 12345,
  tickLimit: 1000,
  units: [
    { id: "player", side: "player", stats: { maxHp: 500, patk: 100, def: 20, hit: 100, flee: 20, critRate: 10, critDamage: 150, spd: 120, matK: 20, maxEnergy: 100 } },
    { id: "enemy", side: "enemy", stats: { maxHp: 300, patk: 60, def: 10, hit: 90, flee: 10, critRate: 5, critDamage: 150, spd: 90, matK: 10, maxEnergy: 100 } }
  ]
};

test("battle simulation is deterministic for the same setup and seed", () => {
  const first = simulateBattle(setup);
  const second = simulateBattle(setup);
  assert.deepEqual(first, second);
  assert.equal(first.outcome, "victory");
  assert.match(first.checksum, /^[0-9a-f]{8}$/);
});

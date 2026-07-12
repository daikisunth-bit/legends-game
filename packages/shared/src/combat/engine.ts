import { Mulberry32 } from "./prng.js";
import type { BattleEvent, BattleResult, BattleSetup, CombatUnitSetup } from "./types.js";

const GAUGE_MAX = 1000;
const SPD_MIN = 20;

interface RuntimeUnit {
  readonly setup: CombatUnitSetup;
  hp: number;
  gauge: number;
}

function validateSetup(setup: BattleSetup): void {
  if (!Number.isInteger(setup.tickLimit) || setup.tickLimit <= 0) {
    throw new RangeError("tickLimit must be a positive integer.");
  }
  if (setup.units.length < 2) {
    throw new RangeError("A battle requires at least two units.");
  }
  const ids = new Set<string>();
  for (const unit of setup.units) {
    if (ids.has(unit.id)) {
      throw new Error(`Duplicate unit id: ${unit.id}`);
    }
    ids.add(unit.id);
    if (unit.stats.maxHp <= 0 || unit.stats.spd <= 0) {
      throw new RangeError(`Invalid stats for unit ${unit.id}.`);
    }
  }
}

function pickTarget(actor: RuntimeUnit, units: readonly RuntimeUnit[]): RuntimeUnit | undefined {
  return units
    .filter((candidate) => candidate.hp > 0 && candidate.setup.side !== actor.setup.side)
    .sort((left, right) => left.hp - right.hp || left.setup.id.localeCompare(right.setup.id))[0];
}

function calculateChecksum(result: Omit<BattleResult, "checksum">): string {
  const input = JSON.stringify(result);
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function simulateBattle(setup: BattleSetup): BattleResult {
  validateSetup(setup);
  const random = new Mulberry32(setup.seed);
  const units: RuntimeUnit[] = setup.units.map((unit) => ({
    setup: unit,
    hp: unit.stats.maxHp,
    gauge: 0
  }));
  const events: BattleEvent[] = [];

  const isSideAlive = (side: "player" | "enemy"): boolean =>
    units.some((unit) => unit.setup.side === side && unit.hp > 0);

  for (let tick = 1; tick <= setup.tickLimit; tick += 1) {
    for (const unit of units) {
      if (unit.hp > 0) {
        unit.gauge += Math.max(SPD_MIN, Math.floor(unit.setup.stats.spd));
      }
    }

    const ready = units
      .filter((unit) => unit.hp > 0 && unit.gauge >= GAUGE_MAX)
      .sort((left, right) => {
        const gaugeOrder = right.gauge - left.gauge;
        if (gaugeOrder !== 0) return gaugeOrder;
        const speedOrder = right.setup.stats.spd - left.setup.stats.spd;
        if (speedOrder !== 0) return speedOrder;
        return random.nextFloat() < 0.5 ? -1 : 1;
      });

    for (const actor of ready) {
      if (actor.hp <= 0) continue;
      const target = pickTarget(actor, units);
      actor.gauge -= GAUGE_MAX;
      if (!target) continue;

      events.push({ tick, type: "normal_attack", actorId: actor.setup.id, targetId: target.setup.id });

      const hitChance = Math.min(
        100,
        Math.max(50, 90 + (actor.setup.stats.hit - target.setup.stats.flee) * 0.5)
      );
      if (random.nextFloat() * 100 >= hitChance) {
        events.push({ tick, type: "miss", actorId: actor.setup.id, targetId: target.setup.id });
        continue;
      }

      const mitigated = actor.setup.stats.patk * (100 / (100 + Math.max(0, target.setup.stats.def)));
      const variance = 0.95 + random.nextFloat() * 0.1;
      const critical = random.nextFloat() * 100 < actor.setup.stats.critRate;
      const critMultiplier = critical ? actor.setup.stats.critDamage / 100 : 1;
      const damage = Math.max(1, Math.floor(mitigated * variance * critMultiplier));

      target.hp = Math.max(0, target.hp - damage);
      events.push({
        tick,
        type: "damage",
        actorId: actor.setup.id,
        targetId: target.setup.id,
        amount: damage,
        critical
      });

      if (target.hp === 0) {
        events.push({ tick, type: "death", actorId: actor.setup.id, targetId: target.setup.id });
      }

      const playerAlive = isSideAlive("player");
      const enemyAlive = isSideAlive("enemy");
      if (!playerAlive || !enemyAlive) {
        const partial = {
          outcome: playerAlive ? "victory" : "defeat",
          ticksElapsed: tick,
          events,
          remainingHp: Object.fromEntries(units.map((unit) => [unit.setup.id, unit.hp]))
        } as const;
        return { ...partial, checksum: calculateChecksum(partial) };
      }
    }
  }

  const partial = {
    outcome: "timeout",
    ticksElapsed: setup.tickLimit,
    events,
    remainingHp: Object.fromEntries(units.map((unit) => [unit.setup.id, unit.hp]))
  } as const;
  return { ...partial, checksum: calculateChecksum(partial) };
}

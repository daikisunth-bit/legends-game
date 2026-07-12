import type { FusionRecipe, JobDefinition, PlayableJobId } from "../domain/jobs.js";

export const JOB_DEFINITIONS: Readonly<Record<PlayableJobId, JobDefinition>> = {
  swordman: { id: "swordman", tier: 1, nameKey: "job.swordman.name", descriptionKey: "job.swordman.description", baseStats: { str: 18, dex: 10, con: 16, int: 6 } },
  mage: { id: "mage", tier: 1, nameKey: "job.mage.name", descriptionKey: "job.mage.description", baseStats: { str: 6, dex: 10, con: 10, int: 24 } },
  archer: { id: "archer", tier: 1, nameKey: "job.archer.name", descriptionKey: "job.archer.description", baseStats: { str: 12, dex: 22, con: 10, int: 6 } },
  healer: { id: "healer", tier: 1, nameKey: "job.healer.name", descriptionKey: "job.healer.description", baseStats: { str: 6, dex: 10, con: 14, int: 20 } },
  magic_knight: { id: "magic_knight", tier: 2, nameKey: "job.magicKnight.name", descriptionKey: "job.magicKnight.description", baseStats: { str: 16, dex: 10, con: 14, int: 16 } },
  paladin: { id: "paladin", tier: 2, nameKey: "job.paladin.name", descriptionKey: "job.paladin.description", baseStats: { str: 14, dex: 8, con: 22, int: 12 } },
  dragoon: { id: "dragoon", tier: 2, nameKey: "job.dragoon.name", descriptionKey: "job.dragoon.description", baseStats: { str: 20, dex: 16, con: 12, int: 8 } },
  spell_archer: { id: "spell_archer", tier: 2, nameKey: "job.spellArcher.name", descriptionKey: "job.spellArcher.description", baseStats: { str: 8, dex: 20, con: 10, int: 18 } },
  sage: { id: "sage", tier: 2, nameKey: "job.sage.name", descriptionKey: "job.sage.description", baseStats: { str: 6, dex: 10, con: 14, int: 26 } },
  bard: { id: "bard", tier: 2, nameKey: "job.bard.name", descriptionKey: "job.bard.description", baseStats: { str: 8, dex: 18, con: 12, int: 18 } }
};

export const TIER_2_FUSION_RECIPES: readonly FusionRecipe[] = [
  { resultJobId: "magic_knight", ingredientJobIds: ["swordman", "mage"], requiredLevel: 50 },
  { resultJobId: "paladin", ingredientJobIds: ["swordman", "healer"], requiredLevel: 50 },
  { resultJobId: "dragoon", ingredientJobIds: ["swordman", "archer"], requiredLevel: 50 },
  { resultJobId: "spell_archer", ingredientJobIds: ["mage", "archer"], requiredLevel: 50 },
  { resultJobId: "sage", ingredientJobIds: ["mage", "healer"], requiredLevel: 50 },
  { resultJobId: "bard", ingredientJobIds: ["archer", "healer"], requiredLevel: 50 }
];

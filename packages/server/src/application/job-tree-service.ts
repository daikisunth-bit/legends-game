import { STARTER_JOB_IDS, TIER_2_FUSION_RECIPES, TIER_3_SHADOW_IDS, type JobTreeNode, type PlayableJobId } from "@loce/shared";
import type { AccountBootstrap } from "../infrastructure/account-repository.js";

export class JobTreeService {
  build(bootstrap: AccountBootstrap): readonly JobTreeNode[] {
    const jobs = new Map(bootstrap.jobs.map((job) => [job.jobId, job]));
    const tier1: JobTreeNode[] = STARTER_JOB_IDS.map((id) => ({
      id, tier: 1, unlocked: jobs.get(id)?.unlocked ?? false, playable: true,
      displayMode: "revealed", nameKey: `job.${id}.name`
    }));
    const tier2: JobTreeNode[] = TIER_2_FUSION_RECIPES.map((recipe) => {
      const unlocked = jobs.get(recipe.resultJobId)?.unlocked ?? false;
      return {
        id: recipe.resultJobId, tier: 2, unlocked, playable: true,
        displayMode: unlocked ? "revealed" : "silhouette",
        nameKey: unlocked ? `job.${toCamel(recipe.resultJobId)}.name` : "job.secret.name",
        hintKey: unlocked ? undefined : `job.secret.${recipe.resultJobId}.hint`,
        ingredientJobIds: unlocked ? recipe.ingredientJobIds : undefined,
        requiredLevel: unlocked ? recipe.requiredLevel : undefined
      } as JobTreeNode;
    });
    const tier3: JobTreeNode[] = TIER_3_SHADOW_IDS.map((id, index) => ({
      id, tier: 3, unlocked: false, playable: false, displayMode: "silhouette",
      nameKey: "job.secret.name", hintKey: `job.secret.tier3.${index + 1}.hint`
    }));
    return [...tier1, ...tier2, ...tier3];
  }
}
function toCamel(value: PlayableJobId): string {
  return value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

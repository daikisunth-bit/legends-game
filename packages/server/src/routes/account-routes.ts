import type { FastifyInstance, FastifyRequest } from "fastify";
import { isPlayableJobId, isStarterJobId } from "@loce/shared";
import { z } from "zod";
import type { Database } from "../infrastructure/database.js";
import type { AccountRepository } from "../infrastructure/account-repository.js";
import type { JobTreeService } from "../application/job-tree-service.js";

function accountId(request: FastifyRequest): string { return request.user.sub; }
export async function registerAccountRoutes(app: FastifyInstance, database: Database, accounts: AccountRepository, tree: JobTreeService): Promise<void> {
  app.get("/me", { onRequest: [app.authenticate] }, async (request) => accounts.bootstrap(accountId(request)));
  app.get("/jobs/tree", { onRequest: [app.authenticate] }, async (request) => ({ nodes: tree.build(await accounts.bootstrap(accountId(request))) }));
  app.post("/onboarding/select-starter-job", { onRequest: [app.authenticate] }, async (request) => {
    const parsed = z.object({ jobId: z.string().refine(isStarterJobId) }).parse(request.body);
    await database.transaction((client) => accounts.selectStarterJob(client, accountId(request), parsed.jobId));
    return { selectedJobId: parsed.jobId, tutorialNextKey: "tutorial.jobSwitching.intro" };
  });
  app.post("/jobs/switch", { onRequest: [app.authenticate] }, async (request) => {
    const parsed = z.object({ jobId: z.string().refine(isPlayableJobId) }).parse(request.body);
    await accounts.switchJob(accountId(request), parsed.jobId);
    return { currentJobId: parsed.jobId };
  });
}

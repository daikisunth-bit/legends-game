import { z } from "zod";
import { isPlayableJobId, isStarterJobId } from "../domain/jobs.js";
export const selectStarterJobSchema = z.object({ jobId: z.string().refine(isStarterJobId) }).strict();
export const switchJobSchema = z.object({ jobId: z.string().refine(isPlayableJobId) }).strict();
export const battleStartSchema = z.object({ nodeId: z.string().regex(/^map[1-4]\.[a-z0-9_]+$/), presetId: z.string().uuid().optional(), idempotencyKey: z.string().uuid() }).strict();
export const battleAckSchema = z.object({ battleId: z.string().uuid() }).strict();
export const autosaveSchema = z.object({ version:z.number().int().nonnegative(), idempotencyKey:z.string().uuid(), changes:z.object({ tutorialFlags:z.record(z.string(),z.boolean()).optional(), settings:z.object({ language:z.enum(["th","en"]).optional(), autoRepeat:z.boolean().optional(), autoUseScroll:z.boolean().optional() }).strict().optional() }).strict() }).strict();

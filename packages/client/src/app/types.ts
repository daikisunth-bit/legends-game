import type { JobTreeNode, PlayableJobId } from "@loce/shared";
export interface Bootstrap { accountId: string; displayName: string; starterJobSelected: boolean; currentJobId: PlayableJobId | null; jobs: readonly { jobId: PlayableJobId; level: number; unlocked: boolean; rebirthCount: number }[]; }
export interface AuthResponse { accessToken: string; }
export interface JobTreeResponse { nodes: readonly JobTreeNode[]; }

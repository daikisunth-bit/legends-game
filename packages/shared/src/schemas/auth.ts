import { z } from "zod";

export const usernameSchema = z.string().trim().min(3).max(32).regex(/^[A-Za-z0-9_]+$/);
export const displayNameSchema = z.string().trim().min(2).max(32);
export const passwordSchema = z.string().min(8).max(128);

export const registerSchema = z.object({
  username: usernameSchema,
  displayName: displayNameSchema,
  password: passwordSchema,
  inviteCode: z.string().min(1).max(128)
}).strict();

export const loginSchema = z.object({ username: usernameSchema, password: passwordSchema }).strict();
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

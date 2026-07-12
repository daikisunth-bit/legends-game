import test from "node:test";
import assert from "node:assert/strict";
import { registerSchema } from "./auth.js";

test("register schema rejects weak passwords and unknown fields", () => {
  assert.equal(registerSchema.safeParse({ username: "hero", displayName: "Hero", password: "short", inviteCode: "alpha" }).success, false);
  assert.equal(registerSchema.safeParse({ username: "hero", displayName: "Hero", password: "long-pass", inviteCode: "alpha", admin: true }).success, false);
});

test("register schema accepts valid alpha registration", () => {
  assert.equal(registerSchema.safeParse({ username: "hero_01", displayName: "นักผจญภัย", password: "secure-pass-01", inviteCode: "alpha" }).success, true);
});

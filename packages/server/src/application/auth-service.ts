import argon2 from "argon2";
import type { RegisterInput } from "@loce/shared";
import type { Database } from "../infrastructure/database.js";
import type { AccountRepository } from "../infrastructure/account-repository.js";
import { AppError } from "../domain/errors.js";

export class AuthService {
  constructor(
    private readonly database: Database,
    private readonly accounts: AccountRepository,
    private readonly registrationEnabled: boolean,
    private readonly inviteCode: string
  ) {}
  async register(input: RegisterInput): Promise<string> {
    if (!this.registrationEnabled) throw new AppError("error.auth.registrationDisabled", 403);
    if (input.inviteCode !== this.inviteCode) throw new AppError("error.auth.invalidInviteCode", 403);
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id, memoryCost: 65_536, timeCost: 3, parallelism: 1 });
    return this.database.transaction((client) => this.accounts.create(client, { username: input.username, displayName: input.displayName, passwordHash }));
  }
  async authenticate(username: string, password: string): Promise<string> {
    const account = await this.accounts.findByUsername(username);
    if (!account || !(await argon2.verify(account.passwordHash, password))) throw new AppError("error.auth.invalidCredentials", 401);
    return account.id;
  }
}

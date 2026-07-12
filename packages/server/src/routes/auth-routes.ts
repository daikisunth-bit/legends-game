import type { FastifyInstance } from "fastify";
import { loginSchema, registerSchema } from "@loce/shared";
import type { AuthService } from "../application/auth-service.js";

export async function registerAuthRoutes(app: FastifyInstance, auth: AuthService): Promise<void> {
  app.post("/auth/register", { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (request, reply) => {
    const input = registerSchema.parse(request.body);
    const accountId = await auth.register(input);
    return reply.code(201).send({ accessToken: app.jwt.sign({ sub: accountId }) });
  });
  app.post("/auth/login", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (request) => {
    const input = loginSchema.parse(request.body);
    const accountId = await auth.authenticate(input.username, input.password);
    return { accessToken: app.jwt.sign({ sub: accountId }) };
  });
}

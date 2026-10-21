import type { FastifyInstance } from "fastify";
import { authenticateRequest, sendAuthenticationError } from "../authentication.js";

export async function authenticationRoutes(app: FastifyInstance) {
  app.get("/api/v1/auth/me", async (request, reply) => {
    try {
      const principal = await authenticateRequest(request);
      return {
        id: principal.userId,
        email: principal.email,
        displayName: principal.displayName,
        platformRole: principal.platformRole ?? "USER",
        memberships: principal.memberships,
      };
    } catch (error) {
      return sendAuthenticationError(request, reply, error);
    }
  });
}

import type { FastifyInstance } from "fastify";
import {
  authenticateRequest,
  sendAuthenticationError,
} from "../authentication.js";
import {
  canAccessOrganization,
  canAdministerOrganization,
} from "../authorization.js";

export async function organizationRoutes(app: FastifyInstance) {
  app.get<{ Params: { organizationId: string } }>(
    "/api/v1/organizations/:organizationId/access",
    async (request, reply) => {
      let principal;
      try {
        principal = await authenticateRequest(request);
      } catch (error) {
        return sendAuthenticationError(request, reply, error);
      }

      const { organizationId } = request.params;
      if (!canAccessOrganization(principal, organizationId)) {
        return reply.code(403).send({ error: "FORBIDDEN" });
      }

      return {
        organizationId,
        access: true,
        administration: canAdministerOrganization(principal, organizationId),
      };
    },
  );
}

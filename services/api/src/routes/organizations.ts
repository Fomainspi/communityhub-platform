import type { FastifyInstance } from "fastify";
import { canAccessOrganization, canAdministerOrganization, type AuthContext } from "../authorization.js";

export async function organizationRoutes(app: FastifyInstance) {
  app.get<{ Params: { organizationId: string } }>(
    "/api/v1/organizations/:organizationId/access",
    async (request, reply) => {
      // Temporary development context. Production will be populated by the
      // authentication adapter after token validation.
      const context: AuthContext = {
        userId: "anonymous",
        memberships: [],
      };
      const { organizationId } = request.params;

      if (!canAccessOrganization(context, organizationId)) {
        return reply.code(403).send({ error: "FORBIDDEN" });
      }

      return {
        organizationId,
        access: true,
        administration: canAdministerOrganization(context, organizationId),
      };
    },
  );
}

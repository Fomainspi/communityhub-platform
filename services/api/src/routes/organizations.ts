import type { FastifyInstance } from "fastify";
import {
  authenticateRequest,
  sendAuthenticationError,
} from "../authentication.js";
import {
  canAccessOrganization,
  canAdministerOrganization,
} from "../authorization.js";
import { prisma } from "../db.js";

export async function organizationRoutes(app: FastifyInstance) {
  app.get("/api/v1/organizations", async (request, reply) => {
    let principal;
    try {
      principal = await authenticateRequest(request);
    } catch (error) {
      return sendAuthenticationError(request, reply, error);
    }

    if (principal.platformRole === "SUPER_ADMIN") {
      const organizations = await prisma.organization.findMany({
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true, status: true },
      });
      return {
        organizations: organizations.map((organization) => ({
          ...organization,
          role: "SUPER_ADMIN" as const,
        })),
      };
    }

    const memberships = await prisma.membership.findMany({
      where: {
        userId: principal.userId,
        status: "ACTIVE",
        organization: { status: "ACTIVE" },
      },
      orderBy: { organization: { name: "asc" } },
      select: {
        role: true,
        organization: {
          select: { id: true, name: true, slug: true, status: true },
        },
      },
    });

    return {
      organizations: memberships.map(({ role, organization }) => ({
        ...organization,
        role,
      })),
    };
  });

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

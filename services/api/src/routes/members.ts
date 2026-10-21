import type { FastifyInstance } from "fastify";
import {
  authenticateRequest,
  sendAuthenticationError,
} from "../authentication.js";
import { canAdministerOrganization } from "../authorization.js";
import { prisma } from "../db.js";

type MemberQuery = {
  limit?: number;
  offset?: number;
  search?: string;
};

type UpdateMembershipBody = {
  role?: "MEMBER" | "COMMUNITY_ADMIN";
  status?: "ACTIVE" | "INVITED" | "SUSPENDED" | "LEFT";
};

const memberQuerySchema = {
  type: "object",
  properties: {
    limit: { type: "integer", minimum: 1, maximum: 100, default: 25 },
    offset: { type: "integer", minimum: 0, default: 0 },
    search: { type: "string", maxLength: 100 },
  },
  additionalProperties: false,
};

const updateMembershipSchema = {
  type: "object",
  properties: {
    role: { type: "string", enum: ["MEMBER", "COMMUNITY_ADMIN"] },
    status: { type: "string", enum: ["ACTIVE", "INVITED", "SUSPENDED", "LEFT"] },
  },
  minProperties: 1,
  additionalProperties: false,
};

export async function memberRoutes(app: FastifyInstance) {
  app.get<{
    Params: { organizationId: string };
    Querystring: MemberQuery;
  }>(
    "/api/v1/organizations/:organizationId/members",
    { schema: { querystring: memberQuerySchema } },
    async (request, reply) => {
      let principal;
      try {
        principal = await authenticateRequest(request);
      } catch (error) {
        return sendAuthenticationError(request, reply, error);
      }

      const { organizationId } = request.params;
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, status: true },
      });
      if (!organization || organization.status !== "ACTIVE") {
        return reply.code(404).send({ error: "ORGANIZATION_NOT_FOUND" });
      }
      if (!canAdministerOrganization(principal, organizationId)) {
        return reply.code(403).send({ error: "FORBIDDEN" });
      }

      const limit = Math.min(Math.max(request.query.limit ?? 25, 1), 100);
      const offset = Math.max(request.query.offset ?? 0, 0);
      const search = request.query.search?.trim();
      const where = {
        organizationId,
        ...(search
          ? {
              user: {
                OR: [
                  { displayName: { contains: search, mode: "insensitive" as const } },
                  { email: { contains: search, mode: "insensitive" as const } },
                ],
              },
            }
          : {}),
      };

      const [memberships, total] = await Promise.all([
        prisma.membership.findMany({
          where,
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          skip: offset,
          take: limit,
          select: {
            id: true,
            role: true,
            status: true,
            joinedAt: true,
            createdAt: true,
            user: {
              select: { id: true, displayName: true, email: true, status: true },
            },
          },
        }),
        prisma.membership.count({ where }),
      ]);

      return {
        organizationId,
        members: memberships,
        pagination: { limit, offset, total, hasMore: offset + memberships.length < total },
      };
    },
  );

  app.patch<{
    Params: { organizationId: string; membershipId: string };
    Body: UpdateMembershipBody;
  }>(
    "/api/v1/organizations/:organizationId/members/:membershipId",
    { schema: { body: updateMembershipSchema } },
    async (request, reply) => {
      let principal;
      try {
        principal = await authenticateRequest(request);
      } catch (error) {
        return sendAuthenticationError(request, reply, error);
      }

      const { organizationId, membershipId } = request.params;
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { status: true },
      });
      if (!organization || organization.status !== "ACTIVE") {
        return reply.code(404).send({ error: "ORGANIZATION_NOT_FOUND" });
      }
      if (!canAdministerOrganization(principal, organizationId)) {
        return reply.code(403).send({ error: "FORBIDDEN" });
      }

      const requestedRole = request.body.role;
      const requestedStatus = request.body.status;

      try {
        const updated = await prisma.$transaction(async (tx) => {
          const existing = await tx.membership.findFirst({
            where: { id: membershipId, organizationId },
            select: {
              id: true,
              userId: true,
              role: true,
              status: true,
            },
          });
          if (!existing) return null;

          if (
            existing.userId === principal.userId &&
            principal.platformRole !== "SUPER_ADMIN"
          ) {
            return { error: "CANNOT_MODIFY_OWN_MEMBERSHIP" as const };
          }

          const nextRole = requestedRole ?? existing.role;
          const nextStatus = requestedStatus ?? existing.status;
          const removesActiveAdmin =
            existing.role === "COMMUNITY_ADMIN" &&
            existing.status === "ACTIVE" &&
            (nextRole !== "COMMUNITY_ADMIN" || nextStatus !== "ACTIVE");

          if (removesActiveAdmin) {
            const activeAdmins = await tx.membership.count({
              where: {
                organizationId,
                role: "COMMUNITY_ADMIN",
                status: "ACTIVE",
              },
            });
            if (activeAdmins <= 1) return { error: "LAST_COMMUNITY_ADMIN" as const };
          }

          const membership = await tx.membership.update({
            where: { id: existing.id },
            data: {
              ...(requestedRole ? { role: requestedRole } : {}),
              ...(requestedStatus ? { status: requestedStatus } : {}),
            },
            select: {
              id: true,
              role: true,
              status: true,
              joinedAt: true,
              createdAt: true,
              user: {
                select: { id: true, displayName: true, email: true, status: true },
              },
            },
          });

          await tx.auditLog.create({
            data: {
              actorUserId: principal.userId,
              organizationId,
              action: "MEMBERSHIP_UPDATED",
              resourceType: "Membership",
              resourceId: existing.id,
              metadata: {
                previousRole: existing.role,
                previousStatus: existing.status,
                role: membership.role,
                status: membership.status,
              },
            },
          });

          return { membership };
        }, { isolationLevel: "Serializable" });

        if (!updated) return reply.code(404).send({ error: "MEMBERSHIP_NOT_FOUND" });
        if ("error" in updated) {
          const statusCode = updated.error === "LAST_COMMUNITY_ADMIN" ? 409 : 403;
          return reply.code(statusCode).send({ error: updated.error });
        }
        return { membership: updated.membership };
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "P2034"
        ) {
          return reply.code(409).send({ error: "CONCURRENT_MEMBERSHIP_CHANGE" });
        }
        request.log.error({ err: error }, "Failed to update community membership");
        return reply.code(500).send({ error: "INTERNAL_SERVER_ERROR" });
      }
    },
  );
}

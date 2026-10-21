import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";

export async function systemRoutes(app: FastifyInstance) {
  app.get("/ready", async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: "ready", service: "communityhub-api", database: "connected" };
    } catch {
      return reply.code(503).send({
        status: "not_ready",
        service: "communityhub-api",
        database: "unavailable",
      });
    }
  });
}

import Fastify from "fastify";
import { authenticationRoutes } from "./routes/authentication.js";
import { memberRoutes } from "./routes/members.js";
import { organizationRoutes } from "./routes/organizations.js";
import { systemRoutes } from "./routes/system.js";

const app = Fastify({ logger: true });

app.get("/health", async () => ({
  status: "ok",
  service: "communityhub-api",
  version: "0.1.0",
}));

app.get("/api/v1", async () => ({
  name: "CommunityHub API",
  version: "v1",
  domains: ["identity", "organizations", "memberships"],
}));

await app.register(systemRoutes);
await app.register(authenticationRoutes);
await app.register(organizationRoutes);
await app.register(memberRoutes);

const port = Number(process.env.PORT ?? 4000);

if (process.env.NODE_ENV !== "test") {
  app.listen({ port, host: "0.0.0.0" }).catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
}

export { app };

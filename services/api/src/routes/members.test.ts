import { afterAll, describe, expect, it } from "vitest";
import { app } from "../server.js";

describe("community member API", () => {
  it("rejects unauthenticated member listing", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/organizations/org-123/members",
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "UNAUTHORIZED" });
  });

  it("rejects unauthenticated membership updates", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/organizations/org-123/members/membership-123",
      payload: { status: "SUSPENDED" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "UNAUTHORIZED" });
  });

  it("rejects unsupported membership roles at request validation", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/organizations/org-123/members/membership-123",
      payload: { role: "SUPER_ADMIN" },
    });

    expect(response.statusCode).toBe(400);
  });

  afterAll(async () => {
    await app.close();
  });
});

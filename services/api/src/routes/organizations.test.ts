import { afterAll, describe, expect, it } from "vitest";
import { app } from "../server.js";

describe("organization API", () => {
  it("rejects unauthenticated tenant access", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/organizations/acpinc/access",
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "UNAUTHORIZED" });
  });

  afterAll(async () => {
    await app.close();
  });
});

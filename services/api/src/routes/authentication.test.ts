import { afterAll, describe, expect, it } from "vitest";
import { app } from "../server.js";

describe("authentication API", () => {
  it("does not expose a user profile without a bearer token", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "UNAUTHORIZED" });
  });

  afterAll(async () => {
    await app.close();
  });
});

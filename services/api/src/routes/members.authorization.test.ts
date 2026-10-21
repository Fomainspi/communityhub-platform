import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mockDb = vi.hoisted(() => ({
  organization: { findUnique: vi.fn() },
  membership: {
    findMany: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn(),
}));

const mockAuth = vi.hoisted(() => ({
  principal: {
    userId: "admin-user",
    email: "admin@example.com",
    displayName: "Community Admin",
    platformRole: "USER",
    memberships: [
      { organizationId: "org-1", role: "COMMUNITY_ADMIN", status: "ACTIVE" },
    ],
  },
}));

vi.mock("../db.js", () => ({ prisma: mockDb }));
vi.mock("../authentication.js", () => ({
  authenticateRequest: vi.fn(async () => mockAuth.principal),
  sendAuthenticationError: vi.fn(),
}));

import { app } from "../server.js";

const organization = { id: "org-1", status: "ACTIVE" };

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.principal = {
    userId: "admin-user",
    email: "admin@example.com",
    displayName: "Community Admin",
    platformRole: "USER",
    memberships: [
      { organizationId: "org-1", role: "COMMUNITY_ADMIN", status: "ACTIVE" },
    ],
  };
  mockDb.organization.findUnique.mockResolvedValue(organization);
  mockDb.membership.findMany.mockResolvedValue([]);
  mockDb.membership.count.mockResolvedValue(0);
});

describe("community member authorization and administration", () => {
  it("blocks an administrator from listing another community's members", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/organizations/org-2/members",
    });

    expect(response.statusCode).toBe(403);
    expect(mockDb.membership.findMany).not.toHaveBeenCalled();
  });

  it("returns a paginated member list only for the authorized tenant", async () => {
    mockDb.membership.findMany.mockResolvedValue([
      {
        id: "membership-1",
        role: "MEMBER",
        status: "ACTIVE",
        joinedAt: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        user: {
          id: "member-1",
          displayName: "Member One",
          email: "member@example.com",
          status: "ACTIVE",
        },
      },
    ]);
    mockDb.membership.count.mockResolvedValue(1);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/organizations/org-1/members?limit=10&offset=0",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      organizationId: "org-1",
      members: [{ id: "membership-1", user: { email: "member@example.com" } }],
      pagination: { limit: 10, offset: 0, total: 1, hasMore: false },
    });
    expect(mockDb.membership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: "org-1" }, take: 10, skip: 0 }),
    );
  });

  it("prevents a community admin from changing their own membership", async () => {
    mockDb.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        membership: {
          findFirst: vi.fn().mockResolvedValue({
            id: "membership-admin",
            userId: "admin-user",
            role: "COMMUNITY_ADMIN",
            status: "ACTIVE",
          }),
          count: vi.fn(),
          update: vi.fn(),
        },
        auditLog: { create: vi.fn() },
      }),
    );

    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/organizations/org-1/members/membership-admin",
      payload: { status: "SUSPENDED" },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: "CANNOT_MODIFY_OWN_MEMBERSHIP" });
  });

  it("prevents demoting the last active community administrator", async () => {
    const txMembership = {
      findFirst: vi.fn().mockResolvedValue({
        id: "membership-admin",
        userId: "other-user",
        role: "COMMUNITY_ADMIN",
        status: "ACTIVE",
      }),
      count: vi.fn().mockResolvedValue(1),
      update: vi.fn(),
    };
    mockDb.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        membership: txMembership,
        auditLog: { create: vi.fn() },
      }),
    );

    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/organizations/org-1/members/membership-admin",
      payload: { role: "MEMBER" },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: "LAST_COMMUNITY_ADMIN" });
    expect(txMembership.update).not.toHaveBeenCalled();
  });

  afterAll(async () => {
    await app.close();
  });
});

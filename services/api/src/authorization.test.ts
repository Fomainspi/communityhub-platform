import { describe, expect, it } from "vitest";
import {
  canAccessOrganization,
  canAdministerOrganization,
  type AuthContext,
} from "./authorization";

const memberContext: AuthContext = {
  userId: "user-1",
  memberships: [
    { organizationId: "community-a", role: "MEMBER", status: "ACTIVE" },
    { organizationId: "community-b", role: "COMMUNITY_ADMIN", status: "ACTIVE" },
  ],
};

describe("tenant authorization", () => {
  it("allows an active member into their community", () => {
    expect(canAccessOrganization(memberContext, "community-a")).toBe(true);
  });

  it("denies access to an unrelated community", () => {
    expect(canAccessOrganization(memberContext, "community-c")).toBe(false);
  });

  it("allows community administration only for an admin membership", () => {
    expect(canAdministerOrganization(memberContext, "community-b")).toBe(true);
    expect(canAdministerOrganization(memberContext, "community-a")).toBe(false);
  });

  it("allows a super admin across tenants", () => {
    const context: AuthContext = {
      userId: "platform-admin",
      platformRole: "SUPER_ADMIN",
      memberships: [],
    };

    expect(canAccessOrganization(context, "community-c")).toBe(true);
    expect(canAdministerOrganization(context, "community-c")).toBe(true);
  });
});

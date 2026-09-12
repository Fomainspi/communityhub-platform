export type PlatformRole = "SUPER_ADMIN";
export type MembershipRole = "MEMBER" | "COMMUNITY_ADMIN";

export interface AuthContext {
  userId: string;
  platformRole?: PlatformRole;
  memberships: Array<{
    organizationId: string;
    role: MembershipRole;
    status: "ACTIVE" | "INVITED" | "SUSPENDED" | "LEFT";
  }>;
}

/**
 * Returns true only when the authenticated principal may operate on the tenant.
 * The API must call this before every tenant-scoped operation.
 */
export function canAccessOrganization(
  context: AuthContext,
  organizationId: string,
): boolean {
  if (context.platformRole === "SUPER_ADMIN") return true;

  return context.memberships.some(
    (membership) =>
      membership.organizationId === organizationId &&
      membership.status === "ACTIVE",
  );
}

export function canAdministerOrganization(
  context: AuthContext,
  organizationId: string,
): boolean {
  if (context.platformRole === "SUPER_ADMIN") return true;

  return context.memberships.some(
    (membership) =>
      membership.organizationId === organizationId &&
      membership.role === "COMMUNITY_ADMIN" &&
      membership.status === "ACTIVE",
  );
}

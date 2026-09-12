# Multi-Tenancy Architecture

## Principle
CommunityHub is a multi-tenant platform. A community is a tenant, and new communities must be onboarded through configuration/data rather than source-code changes.

## Tenant boundary
Community-owned records must carry an `organization_id` (or equivalent tenant identifier). Application services must derive the tenant from the authenticated user's membership and must never trust a client-supplied tenant ID without authorization checks.

## Global identity
A user has one global identity. The same user may belong to multiple communities through membership records.

```text
User
 |
 +-- Membership -> Community A
 |
 +-- Membership -> Community B
 |
 +-- Membership -> Community C
```

## Access rules
- Super Admin: global platform access.
- Community Admin: administrative access only within assigned community/communities.
- Member: access to communities where an active membership exists.
- Global features such as LookAtMe and Marche apply platform-level rules in addition to community membership rules.

## Isolation requirements
1. Enforce authorization server-side on every tenant-scoped operation.
2. Never expose another community's records through IDs alone.
3. Add automated authorization tests for cross-tenant access.
4. Log security-sensitive tenant access.
5. Keep tenant identifiers on audit records.

## First tenant
ACPInc is the first pilot community. It is seed/configuration data, not a hard-coded application special case.

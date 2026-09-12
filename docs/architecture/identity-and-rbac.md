# Identity and RBAC

## Identity model
CommunityHub separates global identity from community membership.

Core entities:
- `users`: one global account per person.
- `organizations`: communities/tenants.
- `memberships`: relationship between users and organizations.
- `roles`: platform and community roles.
- `permissions`: actions granted by roles.

## Roles

### Super Admin
Platform-wide administration, community provisioning, global moderation, platform configuration and operational visibility.

### Community Admin
Administration of an assigned community, including members, content, events and community settings. No access to unrelated communities.

### Member
Access to permitted community features and global member features according to platform policies.

## Authorization flow

```text
Request
  -> Authentication
  -> Resolve global user
  -> Resolve membership(s)
  -> Resolve role/permissions
  -> Verify resource tenant
  -> Authorize action
  -> Execute
  -> Audit security-sensitive action
```

Authorization is enforced in the API/service layer. Frontend controls are for UX only and are never considered a security boundary.

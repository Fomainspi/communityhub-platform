# CommunityHub API

Backend service responsible for authentication integration, authorization, tenant resolution and business APIs.

## Initial domain boundary

```text
Identity
  -> Users
  -> Organizations
  -> Memberships
  -> Roles / Permissions
  -> Audit
```

Every tenant-scoped endpoint must resolve authorization from the authenticated identity and membership context before accessing data.

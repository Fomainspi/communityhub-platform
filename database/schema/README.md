# Initial Database Model

The first schema should establish the platform identity and tenancy boundary.

## Core tables

```text
users
  id
  email
  display_name
  status
  created_at
  updated_at

organizations
  id
  slug
  name
  status
  created_at
  updated_at

memberships
  id
  user_id -> users.id
  organization_id -> organizations.id
  role
  status
  joined_at
  created_at
  updated_at

roles
permissions
role_permissions

sessions / identity-provider references

audit_logs
  id
  actor_user_id
  organization_id (nullable for platform-wide actions)
  action
  resource_type
  resource_id
  created_at
```

## Constraints
- `organizations.slug` is unique.
- `(user_id, organization_id)` is unique in memberships.
- Foreign keys are mandatory for tenant relationships.
- Soft deletion/status handling should be considered where business recovery is required.
- Do not store authentication passwords in this application when a managed identity provider is used.

The concrete ORM and migration implementation will be added after the application workspace is established.

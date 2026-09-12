# ADR-001: Use a Monorepo

## Status
Accepted

## Decision
CommunityHub will use a monorepo so the web application, administration interface, backend services, shared UI, shared types and infrastructure can evolve together.

## Initial structure

```text
apps/
  web/       # member/community web experience
  admin/     # platform and community administration
services/
  api/       # backend API
packages/
  ui/        # shared UI components
  types/     # shared TypeScript contracts
  config/    # shared tooling configuration
infrastructure/
  terraform/
  docker/
database/
docs/
```

## Rationale
- Shared types reduce contract drift.
- Shared UI keeps the products visually consistent.
- One CI pipeline can validate the platform as a whole.
- Infrastructure and application changes remain traceable in one repository.

## Consequence
Repository conventions, ownership boundaries and CI checks must be established early to avoid a large unstructured codebase.

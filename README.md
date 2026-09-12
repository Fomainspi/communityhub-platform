# CommunityHub Platform

CommunityHub is a multi-tenant digital platform designed to connect communities, manage memberships and community operations, provide a private member social network (**LookAtMe**), and enable a cross-community marketplace (**Marché**).

## Vision

Build one reusable platform where new communities can be onboarded without changing the source code, while keeping each community's administration and data isolated.

## Product Domains

- **CommunityHub** — community management, members, events, documents, communication, finance, administration, and reporting.
- **LookAtMe** — private member social network with profiles, posts, comments, reactions, follows, discovery, and moderation.
- **Marché** — transversal marketplace where verified members can create shops and sell products or services across communities.

## Core Architecture Principles

1. Multi-tenancy by design: community-owned data is scoped by `organization_id`.
2. One global identity: a user can belong to multiple communities.
3. Role-based access control: Super Admin, Community Admin, and Member permissions are enforced server-side.
4. Data isolation: a community administrator can access only the data belonging to their community.
5. Extensible architecture: adding a community should be a configuration/onboarding operation, not a code fork.
6. Security first: authentication, authorization, auditability, secure secrets, validation, logging, and DevSecOps are foundational requirements.

## Target Stack

The initial implementation is planned around:

- TypeScript
- Next.js / React
- Node.js API services
- PostgreSQL
- Prisma
- AWS Cognito
- Amazon S3
- Amazon SES
- Docker
- Terraform
- GitHub Actions

Kubernetes / Amazon EKS will be introduced when scale and operational requirements justify it.

## Repository Structure

```text
communityhub-platform/
├── apps/
│   ├── web/
│   ├── admin/
│   └── mobile/
├── services/
│   ├── api/
│   ├── auth/
│   ├── social/
│   └── marketplace/
├── packages/
│   ├── ui/
│   ├── types/
│   └── config/
├── infrastructure/
│   ├── terraform/
│   └── docker/
├── database/
│   ├── migrations/
│   ├── schema/
│   └── seed/
├── docs/
│   ├── architecture/
│   ├── product/
│   ├── security/
│   ├── api/
│   └── decisions/
└── .github/
    └── workflows/
```

## Foundation Flow

```text
COMMUNITYHUB
      |
 IDENTITY / AUTH
      |
 ORGANIZATIONS
      |
 MEMBERSHIPS
      |
 RBAC / IAM
    /   |   \
COMMUNITY LOOKATME MARCHÉ
```

## First Pilot

**ACPInc (Association of Cameroonians in the Philippines)** is intended to be the first pilot community. It should be represented as tenant/configuration data rather than hard-coded application logic.

## Status

Architecture and product blueprint phase. Implementation will proceed incrementally, starting with the platform foundation: identity, organizations, memberships, RBAC, tenant isolation, and shared UI/components.

# Local PostgreSQL and Prisma setup

This guide applies to the API in `services/api`.

## 1. Configure the connection

Copy `services/api/.env.example` to `services/api/.env` and set `DATABASE_URL` to your local PostgreSQL database. Keep real credentials in the ignored `.env` file; never commit them.

Example for a local database:

```env
DATABASE_URL="postgresql://communityhub:YOUR_PASSWORD@localhost:5432/communityhub?schema=public"
PORT=4000
NODE_ENV=development
```

Create the database and database role in PostgreSQL before running migrations. The example connection string is illustrative; it does not create the database or role.

## 2. Generate Prisma Client

From the repository root:

```bash
pnpm --filter @communityhub/api prisma:generate
```

If pnpm 10 reports ignored dependency build scripts during installation, review the packages with `pnpm approve-builds` and approve only the required, trusted packages. Do not use sudo for pnpm.

## 3. Apply the checked-in migration

For a local development database:

```bash
pnpm --filter @communityhub/api prisma:migrate:dev
```

For a deployment environment where migrations have already been reviewed and committed:

```bash
pnpm --filter @communityhub/api prisma:migrate:deploy
```

Check migration status:

```bash
pnpm --filter @communityhub/api prisma:migrate:status
```

Do not run `migrate dev` against production.

## 4. Verify the API

Start the API with `pnpm dev:api`. The liveness endpoint `GET /health` confirms that the process is running. The readiness endpoint `GET /ready` performs a database query and returns HTTP 200 only when PostgreSQL is reachable; otherwise it returns HTTP 503 without exposing connection details.

## Current scope and security note

The initial migration contains users, organizations, memberships, and audit logs. The API's authentication route currently uses a temporary anonymous context, so database connectivity does not mean sign-in or tenant-scoped operations are production-ready. Do not expose this MVP as a production service until a real identity provider, token validation, user provisioning, and server-side membership authorization are implemented and tested.

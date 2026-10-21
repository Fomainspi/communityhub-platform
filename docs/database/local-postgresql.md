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

## 5. Configure Amazon Cognito authentication

Set the following in `services/api/.env` using values from your Cognito User Pool and app client:

- `AWS_REGION`: the AWS region containing the user pool.
- `COGNITO_USER_POOL_ID`: the pool ID.
- `COGNITO_CLIENT_ID`: the app client ID expected in access-token claims.
- `COGNITO_DOMAIN`: the HTTPS base domain for the user pool's managed login / OAuth endpoints, with no path.

The API validates Cognito access-token signatures against the pool's JWKS endpoint and checks issuer, expiry, token type, and app-client ID. First-time users are provisioned from Cognito's `/oauth2/userInfo` endpoint, so the app client must allow the required OAuth scopes (`openid` and `email`) and the managed login domain must be configured. First-time account provisioning requires Cognito to return a verified email address. Never place client secrets, database passwords, or access tokens in source control.

The API exposes `GET /api/v1/auth/me` for the current authenticated user. Organization access is determined from the user's active database memberships; a valid identity alone does not grant access to any community. The `SUPER_ADMIN` platform role must be assigned through a controlled administrative process, not from client-supplied data.

## Current scope and security note

The initial migration contains users, organizations, memberships, and audit logs. Authentication and membership checks are implemented in the API, but end-to-end sign-in still depends on configuring a real Cognito user pool, app client, domain, and database. Do not expose this MVP as a production service until those settings are configured and tested, migrations have been applied, and the full sign-in and tenant-isolation flows have been verified.

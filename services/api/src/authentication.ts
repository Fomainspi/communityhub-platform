import { createPublicKey, verify as verifySignature } from "node:crypto";
import type { FastifyRequest } from "fastify";
import { prisma } from "./db.js";
import type { AuthContext } from "./authorization.js";

type CognitoConfig = {
  issuer: string;
  clientId: string;
  domain: URL;
};

type CognitoClaims = {
  sub: string;
  iss: string;
  exp: number;
  nbf?: number;
  token_use?: string;
  client_id?: string;
};

type CognitoJwk = JsonWebKey & {
  kid?: string;
  use?: string;
  alg?: string;
};

type UserInfo = {
  sub?: string;
  email?: string;
  name?: string;
  preferred_username?: string;
};

export class AuthenticationError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
  ) {
    super(code);
    this.name = "AuthenticationError";
  }
}

export type AuthenticatedPrincipal = AuthContext & {
  email: string;
  displayName: string;
  status: "ACTIVE";
};

let cachedJwks:
  | { issuer: string; expiresAt: number; keys: CognitoJwk[] }
  | undefined;

function getCognitoConfig(): CognitoConfig {
  const region = process.env.AWS_REGION;
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const clientId = process.env.COGNITO_CLIENT_ID;
  const domainValue = process.env.COGNITO_DOMAIN;

  if (!region || !userPoolId || !clientId || !domainValue) {
    throw new AuthenticationError(503, "AUTHENTICATION_NOT_CONFIGURED");
  }

  let domain: URL;
  try {
    domain = new URL(domainValue);
  } catch {
    throw new AuthenticationError(503, "AUTHENTICATION_NOT_CONFIGURED");
  }

  if (
    domain.protocol !== "https:" ||
    domain.username ||
    domain.password ||
    domain.pathname !== "/" ||
    domain.search ||
    domain.hash
  ) {
    throw new AuthenticationError(503, "AUTHENTICATION_NOT_CONFIGURED");
  }

  return {
    issuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
    clientId,
    domain,
  };
}

function decodeJsonPart<T>(part: string): T {
  try {
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as T;
  } catch {
    throw new AuthenticationError(401, "INVALID_TOKEN");
  }
}

async function loadJwks(issuer: string, forceRefresh = false): Promise<CognitoJwk[]> {
  if (
    !forceRefresh &&
    cachedJwks &&
    cachedJwks.issuer === issuer &&
    cachedJwks.expiresAt > Date.now()
  ) {
    return cachedJwks.keys;
  }

  let response: Response;
  try {
    response = await fetch(`${issuer}/.well-known/jwks.json`, {
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    throw new AuthenticationError(503, "IDENTITY_PROVIDER_UNAVAILABLE");
  }

  if (!response.ok) {
    throw new AuthenticationError(503, "IDENTITY_PROVIDER_UNAVAILABLE");
  }

  const body = (await response.json()) as { keys?: CognitoJwk[] };
  if (!Array.isArray(body.keys)) {
    throw new AuthenticationError(503, "IDENTITY_PROVIDER_UNAVAILABLE");
  }

  cachedJwks = {
    issuer,
    keys: body.keys,
    expiresAt: Date.now() + 10 * 60 * 1000,
  };
  return body.keys;
}

async function validateAccessToken(token: string, config: CognitoConfig): Promise<CognitoClaims> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new AuthenticationError(401, "INVALID_TOKEN");
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeJsonPart<{ alg?: string; kid?: string }>(encodedHeader);
  const claims = decodeJsonPart<CognitoClaims>(encodedPayload);

  if (header.alg !== "RS256" || !header.kid) {
    throw new AuthenticationError(401, "INVALID_TOKEN");
  }

  if (
    claims.iss !== config.issuer ||
    claims.token_use !== "access" ||
    claims.client_id !== config.clientId ||
    typeof claims.sub !== "string" ||
    typeof claims.exp !== "number" ||
    claims.exp <= Math.floor(Date.now() / 1000) ||
    (typeof claims.nbf === "number" && claims.nbf > Math.floor(Date.now() / 1000))
  ) {
    throw new AuthenticationError(401, "INVALID_TOKEN");
  }

  let keys = await loadJwks(config.issuer);
  let jwk = keys.find((key) => key.kid === header.kid && key.use !== "enc");
  if (!jwk) {
    keys = await loadJwks(config.issuer, true);
    jwk = keys.find((key) => key.kid === header.kid && key.use !== "enc");
  }
  if (!jwk) {
    throw new AuthenticationError(401, "INVALID_TOKEN");
  }

  let valid = false;
  try {
    const publicKey = createPublicKey({ key: jwk, format: "jwk" });
    valid = verifySignature(
      "RSA-SHA256",
      Buffer.from(`${encodedHeader}.${encodedPayload}`),
      publicKey,
      Buffer.from(encodedSignature, "base64url"),
    );
  } catch {
    valid = false;
  }

  if (!valid) {
    throw new AuthenticationError(401, "INVALID_TOKEN");
  }

  return claims;
}

async function getCognitoUserInfo(
  accessToken: string,
  config: CognitoConfig,
  expectedSubject: string,
): Promise<UserInfo> {
  let response: Response;
  try {
    response = await fetch(new URL("/oauth2/userInfo", config.domain), {
      headers: { authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    throw new AuthenticationError(503, "IDENTITY_PROVIDER_UNAVAILABLE");
  }

  if (!response.ok) {
    throw new AuthenticationError(401, "INVALID_TOKEN");
  }

  const profile = (await response.json()) as UserInfo;
  if (profile.sub !== expectedSubject || !profile.email?.trim()) {
    throw new AuthenticationError(403, "PROFILE_EMAIL_REQUIRED");
  }

  return profile;
}

export async function authenticateRequest(
  request: FastifyRequest,
): Promise<AuthenticatedPrincipal> {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    throw new AuthenticationError(401, "UNAUTHORIZED");
  }

  const token = authorization.slice("Bearer ".length).trim();
  if (!token) {
    throw new AuthenticationError(401, "UNAUTHORIZED");
  }

  const config = getCognitoConfig();
  const claims = await validateAccessToken(token, config);

  let user = await prisma.user.findUnique({
    where: { authSubject: claims.sub },
    include: { memberships: true },
  });

  if (!user) {
    const profile = await getCognitoUserInfo(token, config, claims.sub);
    const email = profile.email!.trim().toLowerCase();
    const displayName =
      profile.name?.trim() ||
      profile.preferred_username?.trim() ||
      email.split("@")[0];

    const existingByEmail = await prisma.user.findUnique({ where: { email } });
    if (existingByEmail?.authSubject && existingByEmail.authSubject !== claims.sub) {
      throw new AuthenticationError(409, "ACCOUNT_LINK_CONFLICT");
    }

    if (existingByEmail) {
      await prisma.user.update({
        where: { id: existingByEmail.id },
        data: { authSubject: claims.sub, displayName },
      });
    } else {
      await prisma.user.create({
        data: { authSubject: claims.sub, email, displayName },
      });
    }

    user = await prisma.user.findUnique({
      where: { authSubject: claims.sub },
      include: { memberships: true },
    });
  }

  if (!user || user.status !== "ACTIVE") {
    throw new AuthenticationError(403, "ACCOUNT_INACTIVE");
  }

  return {
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    status: "ACTIVE",
    platformRole: user.platformRole === "SUPER_ADMIN" ? "SUPER_ADMIN" : undefined,
    memberships: user.memberships.map((membership) => ({
      organizationId: membership.organizationId,
      role: membership.role,
      status: membership.status,
    })),
  };
}

export function sendAuthenticationError(
  request: FastifyRequest,
  reply: { code: (statusCode: number) => { send: (body: { error: string }) => unknown } },
  error: unknown,
): unknown {
  if (error instanceof AuthenticationError) {
    return reply.code(error.statusCode).send({ error: error.code });
  }

  request.log.error({ err: error }, "Unexpected authentication failure");
  return reply.code(500).send({ error: "INTERNAL_SERVER_ERROR" });
}

import { generateKeyPairSync, sign } from "node:crypto";
import type { FastifyRequest } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("./db.js", () => ({ prisma: mockPrisma }));

import { authenticateRequest } from "./authentication.js";

const region = "ap-southeast-1";
const userPoolId = `${region}_testpool`;
const clientId = "test-client-id";
const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
const domain = "https://communityhub-test.auth.ap-southeast-1.amazoncognito.com";
const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicJwk = {
  ...publicKey.export({ format: "jwk" }),
  kid: "communityhub-test-key",
  use: "sig",
  alg: "RS256",
};

function createToken(
  signingKey = privateKey,
  overrides: Record<string, unknown> = {},
): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT", kid: "communityhub-test-key" }),
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: issuer,
      sub: "cognito-subject-123",
      exp: Math.floor(Date.now() / 1000) + 300,
      token_use: "access",
      client_id: clientId,
      ...overrides,
    }),
  ).toString("base64url");
  const signingInput = `${header}.${payload}`;
  const signature = sign("RSA-SHA256", Buffer.from(signingInput), signingKey).toString(
    "base64url",
  );
  return `${signingInput}.${signature}`;
}

function requestWithToken(token: string): FastifyRequest {
  return {
    headers: { authorization: `Bearer ${token}` },
  } as unknown as FastifyRequest;
}

beforeEach(() => {
  vi.stubEnv("AWS_REGION", region);
  vi.stubEnv("COGNITO_USER_POOL_ID", userPoolId);
  vi.stubEnv("COGNITO_CLIENT_ID", clientId);
  vi.stubEnv("COGNITO_DOMAIN", domain);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request) => {
      if (String(input).endsWith("/.well-known/jwks.json")) {
        return new Response(JSON.stringify({ keys: [publicJwk] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          sub: "cognito-subject-123",
          email: "Member@Example.com",
          email_verified: true,
          name: "Community Member",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }),
  );
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Cognito authentication", () => {
  it("validates an access token and provisions a verified first-time user", async () => {
    const user = {
      id: "user-123",
      authSubject: "cognito-subject-123",
      email: "member@example.com",
      displayName: "Community Member",
      status: "ACTIVE",
      platformRole: "USER",
      memberships: [],
    };
    let subjectLookupCount = 0;
    mockPrisma.user.findUnique.mockImplementation(async (args: { where: Record<string, string> }) => {
      if (args.where.authSubject) {
        subjectLookupCount += 1;
        return subjectLookupCount === 1 ? null : user;
      }
      return null;
    });
    mockPrisma.user.create.mockResolvedValue(user);

    const principal = await authenticateRequest(requestWithToken(createToken()));

    expect(principal).toMatchObject({
      userId: "user-123",
      email: "member@example.com",
      displayName: "Community Member",
      memberships: [],
    });
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: {
        authSubject: "cognito-subject-123",
        email: "member@example.com",
        displayName: "Community Member",
      },
    });
  });

  it("rejects a token signed by an unknown private key", async () => {
    const attacker = generateKeyPairSync("rsa", { modulusLength: 2048 });

    await expect(
      authenticateRequest(requestWithToken(createToken(attacker.privateKey))),
    ).rejects.toMatchObject({ statusCode: 401, code: "INVALID_TOKEN" });

    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("rejects expired access tokens", async () => {
    const expiredToken = createToken(privateKey, {
      exp: Math.floor(Date.now() / 1000) - 30,
    });

    await expect(
      authenticateRequest(requestWithToken(expiredToken)),
    ).rejects.toMatchObject({ statusCode: 401, code: "INVALID_TOKEN" });

    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });
});

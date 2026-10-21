import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getConfig() {
  const domainValue = process.env.COGNITO_DOMAIN;
  const clientId = process.env.COGNITO_CLIENT_ID;
  const redirectUri =
    process.env.COGNITO_REDIRECT_URI ??
    "http://localhost:3000/api/auth/callback";

  if (!domainValue || !clientId) return null;

  try {
    const domain = new URL(domainValue);
    const callback = new URL(redirectUri);
    if (
      domain.protocol !== "https:" ||
      domain.username ||
      domain.password ||
      domain.pathname !== "/" ||
      domain.search ||
      domain.hash ||
      (callback.protocol !== "https:" &&
        !(callback.protocol === "http:" && callback.hostname === "localhost"))
    ) {
      return null;
    }

    return { domain, clientId, redirectUri };
  } catch {
    return null;
  }
}

export async function GET() {
  const config = getConfig();
  if (!config) {
    return NextResponse.json(
      { error: "AUTHENTICATION_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const authorizeUrl = new URL("/oauth2/authorize", config.domain);
  authorizeUrl.search = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();

  const secure = process.env.NODE_ENV === "production";
  const response = NextResponse.redirect(authorizeUrl);
  const cookieOptions = {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/api/auth",
    maxAge: 600,
  };
  response.cookies.set("communityhub_oauth_state", state, cookieOptions);
  response.cookies.set("communityhub_pkce_verifier", verifier, cookieOptions);
  return response;
}

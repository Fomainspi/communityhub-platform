import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function clearOAuthCookies(response: NextResponse, secure: boolean) {
  const options = {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/api/auth",
    maxAge: 0,
  };
  response.cookies.set("communityhub_oauth_state", "", options);
  response.cookies.set("communityhub_pkce_verifier", "", options);
}

export async function GET(request: NextRequest) {
  const secure = process.env.NODE_ENV === "production";
  const callbackError = () =>
    NextResponse.redirect(new URL("/login?error=sign_in_failed", request.url));

  const domainValue = process.env.COGNITO_DOMAIN;
  const clientId = process.env.COGNITO_CLIENT_ID;
  const redirectUri =
    process.env.COGNITO_REDIRECT_URI ??
    "http://localhost:3000/api/auth/callback";
  const code = request.nextUrl.searchParams.get("code");
  const returnedState = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get("communityhub_oauth_state")?.value;
  const verifier = request.cookies.get("communityhub_pkce_verifier")?.value;

  if (
    !domainValue ||
    !clientId ||
    !code ||
    !returnedState ||
    !expectedState ||
    !verifier ||
    returnedState !== expectedState
  ) {
    const response = callbackError();
    clearOAuthCookies(response, secure);
    return response;
  }

  let domain: URL;
  try {
    domain = new URL(domainValue);
    if (domain.protocol !== "https:" || domain.pathname !== "/" || domain.search || domain.hash) {
      throw new Error("Invalid Cognito domain");
    }
  } catch {
    const response = callbackError();
    clearOAuthCookies(response, secure);
    return response;
  }

  let tokenResponse: Response;
  try {
    tokenResponse = await fetch(new URL("/oauth2/token", domain), {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        code,
        redirect_uri: redirectUri,
        code_verifier: verifier,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    const response = callbackError();
    clearOAuthCookies(response, secure);
    return response;
  }

  if (!tokenResponse.ok) {
    const response = callbackError();
    clearOAuthCookies(response, secure);
    return response;
  }

  const tokens = (await tokenResponse.json()) as {
    access_token?: string;
    token_type?: string;
    expires_in?: number;
  };
  if (!tokens.access_token || tokens.token_type?.toLowerCase() !== "bearer") {
    const response = callbackError();
    clearOAuthCookies(response, secure);
    return response;
  }

  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  clearOAuthCookies(response, secure);
  response.cookies.set("communityhub_access_token", tokens.access_token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: Math.min(Math.max(tokens.expires_in ?? 3600, 60), 3600),
  });
  return response;
}

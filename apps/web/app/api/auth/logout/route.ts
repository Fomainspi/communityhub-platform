import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const domainValue = process.env.COGNITO_DOMAIN;
  const clientId = process.env.COGNITO_CLIENT_ID;
  const logoutUri =
    process.env.COGNITO_LOGOUT_URI ?? new URL("/login", request.url).toString();
  const secure = process.env.NODE_ENV === "production";

  let response: NextResponse;
  if (domainValue && clientId) {
    try {
      const domain = new URL(domainValue);
      if (domain.protocol === "https:" && domain.pathname === "/" && !domain.search && !domain.hash) {
        const logoutUrl = new URL("/logout", domain);
        logoutUrl.search = new URLSearchParams({
          client_id: clientId,
          logout_uri: logoutUri,
        }).toString();
        response = NextResponse.redirect(logoutUrl);
      } else {
        response = NextResponse.redirect(new URL("/login", request.url));
      }
    } catch {
      response = NextResponse.redirect(new URL("/login", request.url));
    }
  } else {
    response = NextResponse.redirect(new URL("/login", request.url));
  }

  response.cookies.set("communityhub_access_token", "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set("communityhub_oauth_state", "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 0,
  });
  response.cookies.set("communityhub_pkce_verifier", "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 0,
  });
  return response;
}

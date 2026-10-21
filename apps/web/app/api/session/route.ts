import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const token = (await cookies()).get("communityhub_access_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const apiBase = process.env.COMMUNITYHUB_API_URL ?? "http://localhost:4000";
  let upstream: Response;
  try {
    upstream = await fetch(new URL("/api/v1/auth/me", apiBase), {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    return NextResponse.json({ error: "API_UNAVAILABLE" }, { status: 503 });
  }

  const body = await upstream.json().catch(() => ({ error: "INVALID_API_RESPONSE" }));
  return NextResponse.json(body, {
    status: upstream.status,
    headers: { "cache-control": "no-store" },
  });
}

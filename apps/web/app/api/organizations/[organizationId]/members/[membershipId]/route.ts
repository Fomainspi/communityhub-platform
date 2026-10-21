import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ organizationId: string; membershipId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "INVALID_ORIGIN" }, { status: 403 });
  }

  const token = (await cookies()).get("communityhub_access_token")?.value;
  if (!token) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const { organizationId, membershipId } = await context.params;
  const apiBase = process.env.COMMUNITYHUB_API_URL ?? "http://localhost:4000";
  try {
    const upstream = await fetch(
      new URL(
        `/api/v1/organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(membershipId)}`,
        apiBase,
      ),
      {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      },
    );
    const body = await upstream.json().catch(() => ({ error: "INVALID_API_RESPONSE" }));
    return NextResponse.json(body, {
      status: upstream.status,
      headers: { "cache-control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "API_UNAVAILABLE" }, { status: 503 });
  }
}

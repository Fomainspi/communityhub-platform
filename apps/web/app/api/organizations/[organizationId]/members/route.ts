import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ organizationId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const token = (await cookies()).get("communityhub_access_token")?.value;
  if (!token) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { organizationId } = await context.params;
  const apiBase = process.env.COMMUNITYHUB_API_URL ?? "http://localhost:4000";
  const query = request.nextUrl.searchParams.toString();

  try {
    const upstream = await fetch(
      new URL(`/api/v1/organizations/${encodeURIComponent(organizationId)}/members${query ? `?${query}` : ""}`, apiBase),
      {
        headers: { authorization: `Bearer ${token} ` .trim() },
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

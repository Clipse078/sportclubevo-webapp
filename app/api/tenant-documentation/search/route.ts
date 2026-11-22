import { NextRequest, NextResponse } from "next/server";

import { searchPublishedDocumentation } from "@/lib/tenant-documentation/search-service";
import { requireTenantDocumentationApiActor } from "@/lib/tenant-documentation/tenant-documentation-api-actor";

export async function GET(request: NextRequest) {
  const access = await requireTenantDocumentationApiActor();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const query = request.nextUrl.searchParams.get("q") ?? "";
  const hits = await searchPublishedDocumentation(access.actor, query);
  return NextResponse.json({ hits });
}
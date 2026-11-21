import { NextRequest, NextResponse } from "next/server";

import { searchTenantDescriptionMentionCandidates } from "@/lib/tasks/task-description-mention-candidates";
import { requireTenantDocumentationApiActor } from "@/lib/tenant-documentation/tenant-documentation-api-actor";

export async function GET(request: NextRequest) {
  const access = await requireTenantDocumentationApiActor();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const query = request.nextUrl.searchParams.get("q") ?? "";
  const options = await searchTenantDescriptionMentionCandidates(
    access.tenantId,
    access.actorUserId,
    query,
  );

  return NextResponse.json({
    options: options.map((row) => ({
      userId: row.userId,
      displayName: row.displayName,
      firstName: row.firstName,
      lastName: row.lastName,
    })),
  });
}
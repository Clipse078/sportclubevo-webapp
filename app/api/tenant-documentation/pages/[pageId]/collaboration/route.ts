import { NextRequest, NextResponse } from "next/server";

import { TenantDocumentationAuthorizationError } from "@/lib/tenant-documentation/authorization";
import { synchronizePageCollaboration } from "@/lib/tenant-documentation/collaboration-sync-service";
import { requireTenantDocumentationApiActor } from "@/lib/tenant-documentation/tenant-documentation-api-actor";

type RouteContext = { params: Promise<{ pageId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const access = await requireTenantDocumentationApiActor();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { pageId } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const clientId = typeof record.clientId === "string" ? record.clientId : null;
  const displayName = typeof record.displayName === "string" ? record.displayName : null;

  if (!clientId || !displayName) {
    return NextResponse.json({ error: "clientId and displayName required" }, { status: 400 });
  }

  try {
    const result = await synchronizePageCollaboration(
      access.actor,
      access.actorUserId,
      {
        pageId,
        clientId,
        displayName,
        updateBase64:
          typeof record.updateBase64 === "string" ? record.updateBase64 : undefined,
        stateVectorBase64:
          typeof record.stateVectorBase64 === "string"
            ? record.stateVectorBase64
            : undefined,
        contentJson: record.contentJson,
        cursorJson: record.cursorJson,
        markDisconnected: record.markDisconnected === true,
      },
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof TenantDocumentationAuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
import { NextResponse } from "next/server";

import {
  listPageVersionHistory,
  TenantDocumentationVersionHistoryError,
} from "@/lib/tenant-documentation/version-history-service";
import { requireTenantDocumentationApiActor } from "@/lib/tenant-documentation/tenant-documentation-api-actor";

type RouteContext = { params: Promise<{ pageId: string }> };

function statusFor(code: TenantDocumentationVersionHistoryError["code"]): number {
  return code === "NOT_FOUND" ? 404 : 403;
}

export async function GET(_request: Request, context: RouteContext) {
  const access = await requireTenantDocumentationApiActor();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { pageId } = await context.params;
  try {
    const versions = await listPageVersionHistory(access.actor, pageId);
    return NextResponse.json({ versions });
  } catch (error) {
    if (error instanceof TenantDocumentationVersionHistoryError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: statusFor(error.code) });
    }
    return NextResponse.json({ error: "Version history failed" }, { status: 500 });
  }
}
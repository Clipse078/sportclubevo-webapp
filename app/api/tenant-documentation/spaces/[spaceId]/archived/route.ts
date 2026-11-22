import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  listArchivedDocumentationPages,
  TenantDocumentationLifecycleError,
} from "@/lib/tenant-documentation/page-lifecycle-service";
import { requireTenantDocumentationApiActor } from "@/lib/tenant-documentation/tenant-documentation-api-actor";

type RouteContext = { params: Promise<{ spaceId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const access = await requireTenantDocumentationApiActor(
    PERMISSIONS.TENANT_DOCUMENTATION_MANAGE,
  );
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { spaceId } = await context.params;

  try {
    const pages = await listArchivedDocumentationPages(access.actor, spaceId);
    return NextResponse.json({ pages });
  } catch (error) {
    if (error instanceof TenantDocumentationLifecycleError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.code === "FORBIDDEN" ? 403 : 400 },
      );
    }
    return NextResponse.json({ error: "List failed" }, { status: 500 });
  }
}
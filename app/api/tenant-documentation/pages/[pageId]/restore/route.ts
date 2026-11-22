import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  restoreArchivedDocumentationPage,
  restoreTrashedDocumentationPage,
  TenantDocumentationLifecycleError,
} from "@/lib/tenant-documentation/page-lifecycle-service";
import { requireTenantDocumentationApiActor } from "@/lib/tenant-documentation/tenant-documentation-api-actor";

type RouteContext = { params: Promise<{ pageId: string }> };

function lifecycleStatus(code: TenantDocumentationLifecycleError["code"]): number {
  switch (code) {
    case "PAGE_NOT_FOUND":
      return 404;
    case "FORBIDDEN":
      return 403;
    case "RESTORE_PARENT_UNAVAILABLE":
    case "RESTORE_ACCESS_BLOCKED":
      return 409;
    case "INVALID_STATE":
      return 409;
    default:
      return 400;
  }
}

export async function POST(request: Request, context: RouteContext) {
  const access = await requireTenantDocumentationApiActor(
    PERMISSIONS.TENANT_DOCUMENTATION_MANAGE,
  );
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { pageId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { source?: string };

  try {
    const result =
      body.source === "trash"
        ? await restoreTrashedDocumentationPage({
            actor: access.actor,
            pageId,
          })
        : await restoreArchivedDocumentationPage({
            actor: access.actor,
            pageId,
          });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof TenantDocumentationLifecycleError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: lifecycleStatus(error.code) },
      );
    }
    return NextResponse.json({ error: "Restore failed" }, { status: 500 });
  }
}
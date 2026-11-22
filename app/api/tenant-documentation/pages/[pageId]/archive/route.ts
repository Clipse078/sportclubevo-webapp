import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  archiveDocumentationPage,
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
    case "HAS_ACTIVE_CHILDREN":
      return 409;
    case "INVALID_STATE":
      return 409;
    default:
      return 400;
  }
}

export async function POST(_request: Request, context: RouteContext) {
  const access = await requireTenantDocumentationApiActor(
    PERMISSIONS.TENANT_DOCUMENTATION_MANAGE,
  );
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { pageId } = await context.params;

  try {
    const result = await archiveDocumentationPage({
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
    return NextResponse.json({ error: "Archive failed" }, { status: 500 });
  }
}
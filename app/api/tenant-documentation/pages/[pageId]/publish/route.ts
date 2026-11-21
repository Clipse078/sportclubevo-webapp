import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { TenantDocumentationAuthorizationError } from "@/lib/tenant-documentation/authorization";
import {
  publishPageDraft,
  TenantDocumentationPublishError,
} from "@/lib/tenant-documentation/publish-service";
import { requireTenantDocumentationApiActor } from "@/lib/tenant-documentation/tenant-documentation-api-actor";

type RouteContext = { params: Promise<{ pageId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const access = await requireTenantDocumentationApiActor(
    PERMISSIONS.TENANT_DOCUMENTATION_PUBLISH,
  );
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { pageId } = await context.params;

  try {
    const displayName =
      `${access.session.user?.firstName ?? ""} ${access.session.user?.lastName ?? ""}`.trim() ||
      access.session.user?.email ||
      "Redaktion";

    const version = await publishPageDraft(
      access.actor,
      access.actorUserId,
      pageId,
      { actorDisplayName: displayName },
    );
    return NextResponse.json({
      id: version.id,
      versionNumber: version.versionNumber,
      publishedAt: version.publishedAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof TenantDocumentationAuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (error instanceof TenantDocumentationPublishError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: "Publish failed" }, { status: 500 });
  }
}
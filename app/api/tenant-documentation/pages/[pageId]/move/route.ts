import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { moveDocumentationPage } from "@/lib/tenant-documentation/page-tree-service";
import { wouldMoveBroadenPublishAudience } from "@/lib/tenant-documentation/publish-audience";
import { requireTenantDocumentationApiActor } from "@/lib/tenant-documentation/tenant-documentation-api-actor";

type RouteContext = { params: Promise<{ pageId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const access = await requireTenantDocumentationApiActor(
    PERMISSIONS.TENANT_DOCUMENTATION_EDIT,
  );
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { pageId } = await context.params;
  let body: { newParentId?: string | null; confirmAudienceBroaden?: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const preview = await wouldMoveBroadenPublishAudience({
    pageId,
    tenantId: access.tenantId,
    newParentId: body.newParentId ?? null,
  });

  if (preview.broadens && !body.confirmAudienceBroaden) {
    return NextResponse.json(
      {
        error: "AUDIENCE_BROADEN_CONFIRM_REQUIRED",
        preview,
      },
      { status: 409 },
    );
  }

  try {
    const page = await moveDocumentationPage({
      actor: access.actor,
      pageId,
      newParentId: body.newParentId ?? null,
      confirmAudienceBroaden: body.confirmAudienceBroaden,
    });
    return NextResponse.json({ page: { id: page.id, parentId: page.parentId } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Move failed";
    const status = message === "AUDIENCE_BROADEN_CONFIRM_REQUIRED" ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
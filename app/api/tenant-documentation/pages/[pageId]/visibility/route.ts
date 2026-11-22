import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { assertPageAccess } from "@/lib/tenant-documentation/page-access-service";
import {
  publishAudienceToLabel,
  replacePagePublishAudienceGrants,
  resolvePublishAudienceView,
  type TenantDocumentationPublishAudience,
} from "@/lib/tenant-documentation/publish-audience";
import { requireTenantDocumentationApiActor } from "@/lib/tenant-documentation/tenant-documentation-api-actor";
import {
  TenantDocumentationAccessLevel,
  TenantDocumentationResourceType,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

type RouteContext = { params: Promise<{ pageId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const access = await requireTenantDocumentationApiActor();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { pageId } = await context.params;
  try {
    await assertPageAccess(access.actor, pageId, TenantDocumentationAccessLevel.VIEW);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const view = await resolvePublishAudienceView(pageId, access.tenantId);
  return NextResponse.json({
    inherited: {
      mode: view.inherited.mode,
      label: publishAudienceToLabel(view.inherited),
      orgUnitIds:
        view.inherited.mode === "org_units" ? [...view.inherited.orgUnitIds] : [],
    },
    effective: {
      mode: view.effective.mode,
      label: publishAudienceToLabel(view.effective),
      orgUnitIds:
        view.effective.mode === "org_units" ? [...view.effective.orgUnitIds] : [],
    },
    explicit: view.explicit
      ? {
          mode: view.explicit.mode,
          orgUnitIds:
            view.explicit.mode === "org_units" ? [...view.explicit.orgUnitIds] : [],
        }
      : null,
    orgUnitOptions: view.explicitOrgUnitLabels ?? [],
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const access = await requireTenantDocumentationApiActor(
    PERMISSIONS.TENANT_DOCUMENTATION_PUBLISH,
  );
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { pageId } = await context.params;
  const page = await prisma.tenantDocumentationPage.findFirst({
    where: { id: pageId, tenantId: access.tenantId },
    select: { id: true },
  });
  if (!page) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await assertPageAccess(access.actor, pageId, TenantDocumentationAccessLevel.PUBLISH);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { mode?: "club" | "org_units"; orgUnitIds?: string[]; inherit?: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.inherit) {
    await prisma.tenantDocumentationAccessGrant.deleteMany({
      where: {
        tenantId: access.tenantId,
        pageId,
        resourceType: TenantDocumentationResourceType.PAGE,
        accessLevel: TenantDocumentationAccessLevel.VIEW,
      },
    });
    const view = await resolvePublishAudienceView(pageId, access.tenantId);
    return NextResponse.json({ ok: true, effective: view.effective });
  }

  let audience: TenantDocumentationPublishAudience;
  if (body.mode === "club") {
    audience = { mode: "club" };
  } else if (body.mode === "org_units") {
    const orgUnitIds = [...new Set((body.orgUnitIds ?? []).filter(Boolean))];
    if (orgUnitIds.length === 0) {
      return NextResponse.json(
        { error: "Mindestens eine Org-Einheit erforderlich" },
        { status: 400 },
      );
    }
    const valid = await prisma.orgUnit.count({
      where: { tenantId: access.tenantId, id: { in: orgUnitIds } },
    });
    if (valid !== orgUnitIds.length) {
      return NextResponse.json({ error: "Ungültige Org-Einheit" }, { status: 400 });
    }
    audience = { mode: "org_units", orgUnitIds };
  } else {
    return NextResponse.json({ error: "mode required" }, { status: 400 });
  }

  await replacePagePublishAudienceGrants({
    tenantId: access.tenantId,
    pageId,
    audience,
  });

  const view = await resolvePublishAudienceView(pageId, access.tenantId);
  return NextResponse.json({ ok: true, effective: view.effective, explicit: view.explicit });
}
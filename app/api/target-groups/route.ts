import { NextRequest, NextResponse } from "next/server";
import { OrgUnitStatus } from "@prisma/client";
import { requireApiPermission } from "@/lib/permissions/require-api-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getTenantFromSession } from "@/lib/tenants/queries";
import {
  createZielgruppe,
  listZielgruppenForManagement,
  ZielgruppeManagementError,
} from "@/lib/communication/zielgruppen/management-service";
import type { ZielgruppeEditorDefinition } from "@/lib/communication/zielgruppen/editor-model";

async function requireZielgruppenManageApi() {
  return requireApiPermission(PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_MANAGE);
}

async function requireZielgruppenViewApi() {
  const manage = await requireApiPermission(PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_MANAGE);
  if (manage.ok) return manage;
  const view = await requireApiPermission(PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_VIEW);
  if (view.ok) return view;
  // Legacy consumers (visibility allowlists, registrations) still list tenant target groups.
  return requireApiPermission(PERMISSIONS.ORG_VIEW);
}

export async function GET() {
  const access = await requireZielgruppenViewApi();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const tenant = await getTenantFromSession(access.session.user?.activeTenantId);
  if (!tenant) return NextResponse.json({ error: "Standard-Tenant nicht gefunden." }, { status: 500 });

  const targetGroups = await listZielgruppenForManagement({
    tenantId: tenant.id,
    statusFilter: "ACTIVE",
  });
  return NextResponse.json({ targetGroups });
}

export async function POST(req: NextRequest) {
  const access = await requireZielgruppenManageApi();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const tenant = await getTenantFromSession(access.session.user?.activeTenantId);
  if (!tenant) return NextResponse.json({ error: "Standard-Tenant nicht gefunden." }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const definition = body?.definition as ZielgruppeEditorDefinition | undefined;
  if (!definition) {
    return NextResponse.json({ error: "Zieldefinition ist erforderlich." }, { status: 400 });
  }

  const validStatuses = Object.values(OrgUnitStatus);
  const status: OrgUnitStatus = validStatuses.includes(body?.status)
    ? body.status
    : OrgUnitStatus.ACTIVE;

  try {
    const targetGroup = await createZielgruppe({
      tenantId: tenant.id,
      name: body?.name ?? "",
      description: body?.description,
      key: body?.key,
      status,
      definition,
    });
    return NextResponse.json(
      { targetGroup: { id: targetGroup.id, key: targetGroup.key, name: targetGroup.name, status: targetGroup.status } },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof ZielgruppeManagementError) {
      const statusCode =
        e.code === "CONFLICT" ? 409 : e.code === "FORBIDDEN" ? 403 : e.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: e.message }, { status: statusCode });
    }
    console.error(e);
    return NextResponse.json({ error: "Zielgruppe konnte nicht erstellt werden." }, { status: 500 });
  }
}

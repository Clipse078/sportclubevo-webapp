import { NextRequest, NextResponse } from "next/server";
import { OrgUnitStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireApiPermission } from "@/lib/permissions/require-api-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getTenantFromSession } from "@/lib/tenants/queries";
import {
  getZielgruppeForManagement,
  updateZielgruppe,
  archiveZielgruppe,
  ZielgruppeManagementError,
} from "@/lib/communication/zielgruppen/management-service";
import type { ZielgruppeEditorDefinition } from "@/lib/communication/zielgruppen/editor-model";

type RouteContext = { params: Promise<{ id: string }> };

async function requireTargetGroupForTenant(id: string, resolvedTenantId: string) {
  const tg = await prisma.targetGroup.findUnique({
    where: { id },
    select: { id: true, tenantId: true },
  });
  if (!tg) return null;
  if (tg.tenantId !== null && tg.tenantId !== resolvedTenantId) return null;
  return tg;
}

async function requireZielgruppenManageApi() {
  return requireApiPermission(PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_MANAGE);
}

async function requireZielgruppenViewApi() {
  const manage = await requireApiPermission(PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_MANAGE);
  if (manage.ok) return manage;
  const view = await requireApiPermission(PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_VIEW);
  if (view.ok) return view;
  return requireApiPermission(PERMISSIONS.ORG_VIEW);
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const access = await requireZielgruppenViewApi();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const tenant = await getTenantFromSession(access.session.user?.activeTenantId);
  if (!tenant) return NextResponse.json({ error: "Standard-Tenant nicht gefunden." }, { status: 500 });

  const { id } = await params;
  const targetGroup = await getZielgruppeForManagement(tenant.id, id);
  if (!targetGroup) return NextResponse.json({ error: "Zielgruppe nicht gefunden." }, { status: 404 });

  return NextResponse.json({ targetGroup });
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const access = await requireZielgruppenManageApi();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const tenant = await getTenantFromSession(access.session.user?.activeTenantId);
  if (!tenant) return NextResponse.json({ error: "Standard-Tenant nicht gefunden." }, { status: 500 });

  const { id } = await params;
  const guard = await requireTargetGroupForTenant(id, tenant.id);
  if (!guard) return NextResponse.json({ error: "Zielgruppe nicht gefunden." }, { status: 404 });

  const body = await req.json().catch(() => ({}));

  try {
    const updated = await updateZielgruppe({
      tenantId: tenant.id,
      targetGroupId: id,
      name: "name" in body ? body.name : undefined,
      description: "description" in body ? body.description : undefined,
      status:
        "status" in body && Object.values(OrgUnitStatus).includes(body.status)
          ? (body.status as OrgUnitStatus)
          : undefined,
      definition: body?.definition as ZielgruppeEditorDefinition | undefined,
    });
    return NextResponse.json({
      targetGroup: {
        id: updated.id,
        key: updated.key,
        name: updated.name,
        status: updated.status,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (e) {
    if (e instanceof ZielgruppeManagementError) {
      const statusCode =
        e.code === "CONFLICT" ? 409 : e.code === "FORBIDDEN" ? 403 : e.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: e.message }, { status: statusCode });
    }
    console.error(e);
    return NextResponse.json({ error: "Zielgruppe konnte nicht aktualisiert werden." }, { status: 500 });
  }
}

/** Soft-delete: archive (preserves historical references). */
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const access = await requireZielgruppenManageApi();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const tenant = await getTenantFromSession(access.session.user?.activeTenantId);
  if (!tenant) return NextResponse.json({ error: "Standard-Tenant nicht gefunden." }, { status: 500 });

  const { id } = await params;
  const guard = await requireTargetGroupForTenant(id, tenant.id);
  if (!guard) return NextResponse.json({ error: "Zielgruppe nicht gefunden." }, { status: 404 });

  try {
    await archiveZielgruppe(tenant.id, id);
    return NextResponse.json({ message: "Zielgruppe archiviert." });
  } catch (e) {
    if (e instanceof ZielgruppeManagementError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Archivierung fehlgeschlagen." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/permissions/require-api-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getTenantFromSession } from "@/lib/tenants/queries";
import {
  duplicateZielgruppe,
  ZielgruppeManagementError,
} from "@/lib/communication/zielgruppen/management-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const access = await requireApiPermission(PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_MANAGE);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const tenant = await getTenantFromSession(access.session.user?.activeTenantId);
  if (!tenant) return NextResponse.json({ error: "Standard-Tenant nicht gefunden." }, { status: 500 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name : undefined;

  try {
    const created = await duplicateZielgruppe({
      tenantId: tenant.id,
      sourceTargetGroupId: id,
      name,
    });
    return NextResponse.json({
      targetGroup: {
        id: created.id,
        key: created.key,
        name: created.name,
        status: created.status,
      },
    });
  } catch (e) {
    if (e instanceof ZielgruppeManagementError) {
      const statusCode = e.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: e.message }, { status: statusCode });
    }
    console.error(e);
    return NextResponse.json({ error: "Duplizieren fehlgeschlagen." }, { status: 500 });
  }
}

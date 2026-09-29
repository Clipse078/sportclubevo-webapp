/**
 * GET/PUT /api/admin/users/[userId]/permission-overrides
 *
 * Tenant-wide individual ALLOW/DENY permission exceptions for a member.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/permissions/require-api-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  listUserPermissionOverrides,
  syncUserPermissionOverrides,
  UserPermissionOverrideError,
} from "@/lib/admin/people-access/user-permission-overrides";

type RouteContext = { params: Promise<{ userId: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const access = await requireApiPermission(PERMISSIONS.USERS_MANAGE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const tenantId = access.session.user?.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Kein Mandanten-Kontext in der Sitzung." }, { status: 403 });
  }

  const { userId } = await params;
  const overrides = await listUserPermissionOverrides(tenantId, userId);
  return NextResponse.json({ overrides });
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const access = await requireApiPermission(PERMISSIONS.USERS_MANAGE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const tenantId = access.session.user?.activeTenantId;
  const actorUserId = access.session.user?.effectiveUserId ?? access.session.user?.id;
  if (!tenantId || !actorUserId) {
    return NextResponse.json({ error: "Kein Mandanten-Kontext in der Sitzung." }, { status: 403 });
  }

  const { userId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger Anfrage-Inhalt." }, { status: 400 });
  }

  const raw = (body as { overrides?: unknown }).overrides;
  const overrides = Array.isArray(raw)
    ? raw
        .filter(
          (item) =>
            typeof item === "object" &&
            item !== null &&
            typeof (item as { permissionKey?: unknown }).permissionKey === "string" &&
            ((item as { effect?: unknown }).effect === "ALLOW" ||
              (item as { effect?: unknown }).effect === "DENY"),
        )
        .map((item) => {
          const row = item as { permissionKey: string; effect: "ALLOW" | "DENY" };
          return { permissionKey: row.permissionKey, effect: row.effect };
        })
    : [];

  try {
    await syncUserPermissionOverrides({
      tenantId,
      userId,
      actorUserId,
      overrides,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UserPermissionOverrideError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }
}

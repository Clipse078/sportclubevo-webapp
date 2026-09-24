import { NextResponse } from "next/server";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { removeClubEventAudienceEntry } from "@/lib/events/club-event-participation-audience-service";

type RouteContext = { params: Promise<{ eventId: string; entryId: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await requireAnyPermission([PERMISSIONS.EVENTS_MANAGE]);
  const tenantId = session.user?.activeTenantId;
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 401 });

  const { entryId } = await context.params;
  try {
    await removeClubEventAudienceEntry(tenantId, entryId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

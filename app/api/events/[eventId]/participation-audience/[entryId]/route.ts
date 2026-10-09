import { NextResponse } from "next/server";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  listClubEventAudienceEntries,
  removeClubEventAudienceEntry,
} from "@/lib/events/club-event-participation-audience-service";
import { resolveTenantKeyForCollaboration } from "@/lib/collaboration/resolve-tenant-key";
import { appendClubEventParticipationAudienceCollaboration } from "@/lib/collaboration/club-event/club-event-participation-audience-collaboration";

type RouteContext = { params: Promise<{ eventId: string; entryId: string }> };

export async function DELETE(request: Request, context: RouteContext) {
  const session = await requireAnyPermission([PERMISSIONS.EVENTS_MANAGE]);
  const tenantId = session.user?.activeTenantId;
  const userId = session.user?.id ?? null;
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 401 });

  const { eventId, entryId } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  try {
    await removeClubEventAudienceEntry(tenantId, entryId);
    const entries = await listClubEventAudienceEntries(tenantId, eventId);
    const tenantKey = await resolveTenantKeyForCollaboration(tenantId);
    const collaborationPayload = userId
      ? await appendClubEventParticipationAudienceCollaboration({
          tenantId,
          tenantKey,
          userId,
          eventId,
          requestBody: body,
        })
      : {};
    return NextResponse.json({ ok: true, entries, ...collaborationPayload });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

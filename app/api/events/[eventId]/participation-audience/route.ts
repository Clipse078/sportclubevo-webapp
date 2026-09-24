import { NextResponse } from "next/server";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  addClubEventAudienceEntry,
  listClubEventAudienceEntries,
} from "@/lib/events/club-event-participation-audience-service";
import { ensureClubEventParticipationResponses } from "@/lib/planning/load-club-event-planning-participants";
import type { EventParticipationAudienceKind } from "@prisma/client";

type RouteContext = { params: Promise<{ eventId: string }> };

function parseKind(value: unknown): EventParticipationAudienceKind | null {
  if (value === "PERSON" || value === "TEAM" || value === "ORG_UNIT" || value === "ROLE") {
    return value;
  }
  return null;
}

export async function GET(_request: Request, context: RouteContext) {
  const session = await requireAnyPermission([PERMISSIONS.EVENTS_VIEW, PERMISSIONS.EVENTS_MANAGE]);
  const tenantId = session.user?.activeTenantId;
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 401 });

  const { eventId } = await context.params;
  const entries = await listClubEventAudienceEntries(tenantId, eventId);
  return NextResponse.json({ entries });
}

export async function POST(request: Request, context: RouteContext) {
  const session = await requireAnyPermission([PERMISSIONS.EVENTS_MANAGE]);
  const tenantId = session.user?.activeTenantId;
  const userId = session.user?.id ?? null;
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 401 });

  const { eventId } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const kind = parseKind(body?.kind);
  if (!kind) {
    return NextResponse.json({ error: "Invalid audience kind" }, { status: 400 });
  }

  try {
    await addClubEventAudienceEntry(
      tenantId,
      eventId,
      {
        kind,
        personId: typeof body?.personId === "string" ? body.personId : null,
        teamId: typeof body?.teamId === "string" ? body.teamId : null,
        orgUnitId: typeof body?.orgUnitId === "string" ? body.orgUnitId : null,
        roleId: typeof body?.roleId === "string" ? body.roleId : null,
      },
      userId,
    );
    await ensureClubEventParticipationResponses(tenantId, eventId);
    const entries = await listClubEventAudienceEntries(tenantId, eventId);
    return NextResponse.json({ entries }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { hasPermission } from "@/lib/permissions/has-permission";
import { commitClubEventComposerDraft } from "@/lib/club-events/composer/club-event-commit-service";
import { resolvePersonIdForUser } from "@/lib/sce/activity-governance/persistence/resolve-person-id";
import { resolvePersonEffectiveActivityGovernance } from "@/lib/sce/activity-governance/persistence/resolve-person-effective-governance";
import type { ClubEventComposerDraftPayload } from "@/lib/club-events/composer/club-event-composer-draft-types";

export async function POST(request: Request) {
  await requirePermission(PERMISSIONS.EVENTS_MANAGE);
  const session = await auth();
  const tenant = await getActiveTenant();
  if (!session?.user?.id || !tenant) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const personId = await resolvePersonIdForUser(tenant.id, session.user.id);
  if (!personId) {
    return NextResponse.json(
      { error: "Keine Personenzuordnung für diesen Benutzer." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    draftId?: string | null;
    payload?: ClubEventComposerDraftPayload;
  } | null;

  if (!body?.payload) {
    return NextResponse.json({ error: "Veranstaltungsdaten fehlen." }, { status: 400 });
  }

  const held = new Set(
    Object.values(PERMISSIONS).filter((key) => hasPermission(session, key)),
  );

  const effectiveGovernance = await resolvePersonEffectiveActivityGovernance({
    tenantId: tenant.id,
    personId,
    activityType: "CLUB_EVENT",
    heldPermissions: held,
  });

  if (!effectiveGovernance.mayCreate) {
    return NextResponse.json({ error: "Keine Berechtigung zum Erstellen." }, { status: 403 });
  }

  try {
    const result = await commitClubEventComposerDraft({
      tenantId: tenant.id,
      actorUserId: session.user.id,
      actorPersonId: personId,
      timezone: tenant.timezone ?? "Europe/Zurich",
      payload: body.payload,
      draftId: body.draftId,
      effectiveGovernance,
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Speichern fehlgeschlagen." },
      { status: 400 },
    );
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { saveClubEventComposerDraft } from "@/lib/club-events/composer/club-event-draft-persistence";
import { resolvePersonIdForUser } from "@/lib/sce/activity-governance/persistence/resolve-person-id";
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
    return NextResponse.json({ error: "Entwurfsdaten fehlen." }, { status: 400 });
  }

  try {
    const result = await saveClubEventComposerDraft({
      tenantId: tenant.id,
      actorPersonId: personId,
      draftId: body.draftId,
      payload: body.payload,
    });
    return NextResponse.json({ draftId: result.draftId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Entwurf speichern fehlgeschlagen." },
      { status: 400 },
    );
  }
}

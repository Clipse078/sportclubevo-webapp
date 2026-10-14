import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { resolvePersonIdForUser } from "@/lib/sce/activity-governance/persistence/resolve-person-id";
import { saveTournamentComposerDraft } from "@/lib/tournaments/composer/tournament-draft-persistence";
import type { TournamentComposerDraftPayload } from "@/lib/tournaments/composer/tournament-composer-draft-types";

export async function POST(request: Request) {
  await requireAnyPermission([PERMISSIONS.EVENTS_MANAGE, PERMISSIONS.EVENTS_VIEW]);
  const session = await auth();
  const tenant = await getActiveTenant();
  if (!session?.user?.id || !tenant) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const personId = await resolvePersonIdForUser(tenant.id, session.user.id);
  if (!personId) {
    return NextResponse.json({ error: "Keine Personenzuordnung." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    draftId?: string | null;
    payload?: TournamentComposerDraftPayload;
  } | null;

  if (!body?.payload) {
    return NextResponse.json({ error: "Eingaben fehlen." }, { status: 400 });
  }

  try {
    const result = await saveTournamentComposerDraft({
      tenantId: tenant.id,
      actorPersonId: personId,
      draftId: body.draftId,
      payload: body.payload,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Entwurf speichern fehlgeschlagen." },
      { status: 400 },
    );
  }
}

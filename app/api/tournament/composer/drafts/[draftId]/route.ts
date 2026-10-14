import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { resolvePersonIdForUser } from "@/lib/sce/activity-governance/persistence/resolve-person-id";
import { getTournamentComposerDraftForCreatorResume } from "@/lib/tournaments/composer/tournament-composer-draft-access.server";

type RouteContext = { params: Promise<{ draftId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
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

  const { draftId } = await params;
  const draft = await getTournamentComposerDraftForCreatorResume({
    tenantId: tenant.id,
    draftId,
    actorPersonId: personId,
  });

  if (!draft) {
    return NextResponse.json({ error: "Entwurf nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json({
    draftId: draft.draftId,
    payload: draft.payload,
    lifecycleState: draft.lifecycleState,
  });
}

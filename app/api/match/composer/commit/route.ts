import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { commitMatchComposerDraft } from "@/lib/matchcenter/composer/match-commit-service";
import { loadMatchEffectiveGovernanceForSession } from "@/lib/matchcenter/composer/load-effective-governance-server";
import { resolvePersonIdForUser } from "@/lib/sce/activity-governance/persistence/resolve-person-id";
import type { MatchComposerDraftPayload } from "@/lib/matchcenter/composer/match-composer-draft-types";
import {
  computeMatchCreateTabErrors,
  firstInvalidMatchCreateTab,
} from "@/lib/matchcenter/match-create-validation";

export async function POST(request: Request) {
  await requireAnyPermission([PERMISSIONS.EVENTS_MANAGE]);
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
    payload?: MatchComposerDraftPayload;
  } | null;

  if (!body?.payload) {
    return NextResponse.json({ error: "Eingaben fehlen." }, { status: 400 });
  }

  const tabErrors = computeMatchCreateTabErrors(body.payload);
  if (Object.keys(tabErrors).length > 0) {
    return NextResponse.json(
      {
        error: "Bitte prüfen Sie die markierten Bereiche.",
        firstInvalidTab: firstInvalidMatchCreateTab(tabErrors),
        tabErrors,
      },
      { status: 400 },
    );
  }

  const effectiveGovernance = await loadMatchEffectiveGovernanceForSession({ tenantId: tenant.id });
  if (!effectiveGovernance?.mayCreate) {
    return NextResponse.json({ error: "Keine Berechtigung zum Erstellen." }, { status: 403 });
  }

  try {
    const result = await commitMatchComposerDraft({
      tenantId: tenant.id,
      actorUserId: session.user.id,
      actorPersonId: personId,
      payload: body.payload,
      draftId: body.draftId,
      effectiveGovernance,
    });

    if (result.outcome === "SUBMITTED_FOR_APPROVAL") {
      return NextResponse.json({
        outcome: result.outcome,
        draftId: result.draftId,
        revisionId: result.revisionId,
      });
    }

    return NextResponse.json({
      outcome: result.outcome,
      eventId: result.eventId,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erstellen fehlgeschlagen." },
      { status: 400 },
    );
  }
}

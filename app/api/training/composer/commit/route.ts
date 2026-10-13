import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { commitTrainingComposerDraft } from "@/lib/training/composer/training-commit-service";
import { loadTrainingEffectiveGovernanceForSession } from "@/lib/training/composer/load-effective-governance-server";
import { resolvePersonIdForUser } from "@/lib/sce/activity-governance/persistence/resolve-person-id";
import type { TrainingComposerDraftPayload } from "@/lib/training/composer/training-composer-draft-types";
import {
  computeTrainingCreateTabErrors,
  firstInvalidTrainingCreateTab,
} from "@/lib/training/training-create-validation";

export async function POST(request: Request) {
  await requirePermission(PERMISSIONS.TRAININGS_MANAGE);
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
    payload?: TrainingComposerDraftPayload;
  } | null;

  if (!body?.payload) {
    return NextResponse.json({ error: "Eingaben fehlen." }, { status: 400 });
  }

  const tabErrors = computeTrainingCreateTabErrors(body.payload);
  if (Object.keys(tabErrors).length > 0) {
    return NextResponse.json(
      {
        error: "Bitte prüfen Sie die markierten Bereiche.",
        firstInvalidTab: firstInvalidTrainingCreateTab(tabErrors),
        tabErrors,
      },
      { status: 400 },
    );
  }

  const effectiveGovernance = await loadTrainingEffectiveGovernanceForSession({ tenantId: tenant.id });
  if (!effectiveGovernance?.mayCreate) {
    return NextResponse.json({ error: "Keine Berechtigung zum Erstellen." }, { status: 403 });
  }

  try {
    const result = await commitTrainingComposerDraft({
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
      seriesId: result.seriesId,
      firstSessionId: result.firstSessionId,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erstellen fehlgeschlagen." },
      { status: 400 },
    );
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getTrainingComposerDraftForCreatorResume } from "@/lib/training/composer/training-composer-draft-access.server";
import { resolvePersonIdForUser } from "@/lib/sce/activity-governance/persistence/resolve-person-id";

type Params = Promise<{ draftId: string }>;

export async function GET(_request: Request, context: { params: Params }) {
  await requireAnyPermission([PERMISSIONS.TRAININGS_MANAGE, PERMISSIONS.TRAININGS_VIEW]);
  const session = await auth();
  const tenant = await getActiveTenant();
  if (!session?.user?.id || !tenant) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const personId = await resolvePersonIdForUser(tenant.id, session.user.id);
  if (!personId) {
    return NextResponse.json({ error: "Keine Personenzuordnung." }, { status: 403 });
  }

  const { draftId } = await context.params;
  const draft = await getTrainingComposerDraftForCreatorResume({
    tenantId: tenant.id,
    draftId,
    creatorPersonId: personId,
  });

  if (!draft) {
    return NextResponse.json({ error: "Entwurf nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json({
    draftId: draft.id,
    lifecycleState: draft.lifecycleState,
    payload: draft.payload,
    revisionNumber: draft.revisionNumber,
  });
}

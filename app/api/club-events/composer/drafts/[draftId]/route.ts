import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { getClubEventComposerDraft } from "@/lib/club-events/composer/club-event-draft-persistence";
import { prisma } from "@/lib/db/prisma";

type RouteContext = { params: Promise<{ draftId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  await requirePermission(PERMISSIONS.EVENTS_MANAGE);
  const tenant = await getActiveTenant();
  if (!tenant) return NextResponse.json({ error: "Tenant fehlt." }, { status: 404 });

  const { draftId } = await context.params;
  const draft = await getClubEventComposerDraft(tenant.id, draftId);
  if (!draft) {
    return NextResponse.json({ error: "Entwurf nicht gefunden." }, { status: 404 });
  }

  const session = await auth();
  void session;

  let reviewerComment: string | null = null;
  if (draft.lifecycleState === "CHANGES_REQUESTED") {
    const revision = await prisma.sceActivityGovernanceRevision.findFirst({
      where: {
        tenantId: tenant.id,
        clubEventDraftId: draft.id,
        isCurrentSubmission: true,
      },
      include: {
        decisions: {
          where: { decision: "REQUEST_CHANGES" },
          orderBy: { decidedAt: "desc" },
          take: 1,
        },
      },
    });
    reviewerComment = revision?.decisions[0]?.comment?.trim() ?? null;
  }

  return NextResponse.json({
    draft: {
      ...draft.payload,
      lifecycleState: draft.lifecycleState,
      revisionNumber: draft.revisionNumber,
    },
    draftId: draft.id,
    lifecycleState: draft.lifecycleState,
    reviewerComment,
  });
}

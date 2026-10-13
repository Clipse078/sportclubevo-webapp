import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { SceActivityEffectiveGovernance } from "@/lib/sce/activity-governance/types";
import { validateActivityGovernanceConfiguration } from "@/lib/sce/activity-governance/configuration-validation";
import type { MatchComposerDraftPayload } from "./match-composer-draft-types";
import { createMatchFromComposerPayload } from "./create-match-from-composer";

export type MatchCommitResult =
  | { outcome: "PUBLISHED"; eventId: string }
  | { outcome: "SUBMITTED_FOR_APPROVAL"; draftId: string; revisionId: string };

export async function commitMatchComposerDraft(input: {
  tenantId: string;
  actorUserId: string;
  actorPersonId: string;
  payload: MatchComposerDraftPayload;
  draftId?: string | null;
  effectiveGovernance: SceActivityEffectiveGovernance;
}): Promise<MatchCommitResult> {
  if (input.effectiveGovernance.publicationAuthority === "APPROVAL_REQUIRED") {
    const configIssues = validateActivityGovernanceConfiguration({
      tenantId: input.tenantId,
      activityTypes: [
        {
          activityType: "MATCH",
          defaultPublicationAuthority: "APPROVAL_REQUIRED",
          validatorPersonIds: input.effectiveGovernance.validatorPersonIds,
          creatorPolicies: [
            {
              personId: input.actorPersonId,
              publicationAuthority: "APPROVAL_REQUIRED",
            },
          ],
        },
      ],
    });
    if (configIssues.length > 0) {
      throw new Error(
        "Freigabe ist nicht möglich: Für Spiele ist kein berechtigter Validator konfiguriert.",
      );
    }

    const policySnapshot = {
      publicationAuthority: input.effectiveGovernance.publicationAuthority,
      validatorPersonIds: input.effectiveGovernance.validatorPersonIds,
    } satisfies Prisma.InputJsonValue;

    const result = await prisma.$transaction(async (tx) => {
      let draftId = input.draftId ?? null;
      if (draftId) {
        await tx.matchComposerDraft.updateMany({
          where: {
            id: draftId,
            tenantId: input.tenantId,
            lifecycleState: { in: ["DRAFT", "CHANGES_REQUESTED"] },
          },
          data: {
            payload: input.payload as unknown as Prisma.InputJsonValue,
            draftResourceSelections: input.payload.resources as unknown as Prisma.InputJsonValue,
            lifecycleState: "PENDING_APPROVAL",
            submittedAt: new Date(),
            updatedByPersonId: input.actorPersonId,
            revisionNumber: { increment: 1 },
          },
        });
      } else {
        const created = await tx.matchComposerDraft.create({
          data: {
            tenantId: input.tenantId,
            createdByPersonId: input.actorPersonId,
            updatedByPersonId: input.actorPersonId,
            lifecycleState: "PENDING_APPROVAL",
            payload: input.payload as unknown as Prisma.InputJsonValue,
            draftResourceSelections: input.payload.resources as unknown as Prisma.InputJsonValue,
            submittedAt: new Date(),
            revisionNumber: 1,
          },
        });
        draftId = created.id;
      }

      const draft = await tx.matchComposerDraft.findFirstOrThrow({
        where: { id: draftId!, tenantId: input.tenantId },
      });

      await tx.sceActivityGovernanceRevision.updateMany({
        where: { matchDraftId: draft.id, isCurrentSubmission: true },
        data: { isCurrentSubmission: false },
      });

      const revision = await tx.sceActivityGovernanceRevision.create({
        data: {
          tenantId: input.tenantId,
          activityType: "MATCH",
          matchDraftId: draft.id,
          revisionNumber: draft.revisionNumber,
          lifecycleState: "PENDING_APPROVAL",
          creatorPersonId: input.actorPersonId,
          submittedAt: new Date(),
          policySnapshot,
          payloadSnapshot: input.payload as unknown as Prisma.InputJsonValue,
          isCurrentSubmission: true,
        },
      });

      return { draftId: draft.id, revisionId: revision.id };
    });

    return {
      outcome: "SUBMITTED_FOR_APPROVAL",
      draftId: result.draftId,
      revisionId: result.revisionId,
    };
  }

  const published = await createMatchFromComposerPayload({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    payload: input.payload,
    reviewStage: "APPROVED",
  });

  if (input.draftId) {
    await prisma.matchComposerDraft.updateMany({
      where: { id: input.draftId, tenantId: input.tenantId },
      data: {
        lifecycleState: "PUBLISHED",
        publishedPrimaryEventId: published.eventId,
      },
    });
  }

  return { outcome: "PUBLISHED", eventId: published.eventId };
}

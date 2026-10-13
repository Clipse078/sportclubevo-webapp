import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { SceActivityEffectiveGovernance } from "@/lib/sce/activity-governance/types";
import { validateActivityGovernanceConfiguration } from "@/lib/sce/activity-governance/configuration-validation";
import type { TrainingComposerDraftPayload } from "./training-composer-draft-types";
import { createTrainingSeriesFromComposerPayload } from "./create-training-series-from-composer";

export type TrainingCommitResult =
  | { outcome: "PUBLISHED"; seriesId: string; firstSessionId: string | null }
  | { outcome: "SUBMITTED_FOR_APPROVAL"; draftId: string; revisionId: string };

export async function commitTrainingComposerDraft(input: {
  tenantId: string;
  actorUserId: string;
  actorPersonId: string;
  payload: TrainingComposerDraftPayload;
  draftId?: string | null;
  effectiveGovernance: SceActivityEffectiveGovernance;
}): Promise<TrainingCommitResult> {
  if (input.effectiveGovernance.publicationAuthority === "APPROVAL_REQUIRED") {
    const configIssues = validateActivityGovernanceConfiguration({
      tenantId: input.tenantId,
      activityTypes: [
        {
          activityType: "TRAINING",
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
        "Freigabe ist nicht möglich: Für Trainings ist kein berechtigter Validator konfiguriert.",
      );
    }

    const policySnapshot = {
      publicationAuthority: input.effectiveGovernance.publicationAuthority,
      validatorPersonIds: input.effectiveGovernance.validatorPersonIds,
    } satisfies Prisma.InputJsonValue;

    const result = await prisma.$transaction(async (tx) => {
      let draftId = input.draftId ?? null;
      if (draftId) {
        await tx.trainingComposerDraft.updateMany({
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
        const created = await tx.trainingComposerDraft.create({
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

      const draft = await tx.trainingComposerDraft.findFirstOrThrow({
        where: { id: draftId!, tenantId: input.tenantId },
      });

      await tx.sceActivityGovernanceRevision.updateMany({
        where: { trainingDraftId: draft.id, isCurrentSubmission: true },
        data: { isCurrentSubmission: false },
      });

      const revision = await tx.sceActivityGovernanceRevision.create({
        data: {
          tenantId: input.tenantId,
          activityType: "TRAINING",
          trainingDraftId: draft.id,
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

  const published = await createTrainingSeriesFromComposerPayload({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    payload: input.payload,
    planningStage: "APPROVED",
  });

  if (input.draftId) {
    await prisma.trainingComposerDraft.updateMany({
      where: { id: input.draftId, tenantId: input.tenantId },
      data: {
        lifecycleState: "PUBLISHED",
        publishedPrimarySeriesId: published.seriesId,
      },
    });
  }

  return {
    outcome: "PUBLISHED",
    seriesId: published.seriesId,
    firstSessionId: published.firstSessionId,
  };
}

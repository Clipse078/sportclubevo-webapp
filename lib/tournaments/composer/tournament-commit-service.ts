import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { SceActivityEffectiveGovernance } from "@/lib/sce/activity-governance/types";
import { validateActivityGovernanceConfiguration } from "@/lib/sce/activity-governance/configuration-validation";
import type { TournamentComposerDraftPayload } from "./tournament-composer-draft-types";
import { createTournamentFromComposerPayload } from "./create-tournament-from-composer";

export type TournamentCommitResult =
  | { outcome: "PUBLISHED"; eventId: string; orchestrationOk?: boolean }
  | { outcome: "SUBMITTED_FOR_APPROVAL"; draftId: string; revisionId: string };

export async function commitTournamentComposerDraft(input: {
  tenantId: string;
  actorUserId: string;
  actorPersonId: string;
  payload: TournamentComposerDraftPayload;
  draftId?: string | null;
  effectiveGovernance: SceActivityEffectiveGovernance;
}): Promise<TournamentCommitResult> {
  if (input.effectiveGovernance.publicationAuthority === "APPROVAL_REQUIRED") {
    const configIssues = validateActivityGovernanceConfiguration({
      tenantId: input.tenantId,
      activityTypes: [
        {
          activityType: "TOURNAMENT",
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
        "Freigabe ist nicht möglich: Für Turniere ist kein berechtigter Validator konfiguriert.",
      );
    }

    const policySnapshot = {
      publicationAuthority: input.effectiveGovernance.publicationAuthority,
      validatorPersonIds: input.effectiveGovernance.validatorPersonIds,
    } satisfies Prisma.InputJsonValue;

    const result = await prisma.$transaction(async (tx) => {
      let draftId = input.draftId ?? null;
      if (draftId) {
        await tx.tournamentComposerDraft.updateMany({
          where: {
            id: draftId,
            tenantId: input.tenantId,
            lifecycleState: { in: ["DRAFT", "CHANGES_REQUESTED"] },
          },
          data: {
            payload: input.payload as unknown as Prisma.InputJsonValue,
            draftResourceSelections: input.payload.resourceAllocations as unknown as Prisma.InputJsonValue,
            lifecycleState: "PENDING_APPROVAL",
            submittedAt: new Date(),
            updatedByPersonId: input.actorPersonId,
            revisionNumber: { increment: 1 },
          },
        });
      } else {
        const created = await tx.tournamentComposerDraft.create({
          data: {
            tenantId: input.tenantId,
            createdByPersonId: input.actorPersonId,
            updatedByPersonId: input.actorPersonId,
            lifecycleState: "PENDING_APPROVAL",
            payload: input.payload as unknown as Prisma.InputJsonValue,
            draftResourceSelections: input.payload.resourceAllocations as unknown as Prisma.InputJsonValue,
            submittedAt: new Date(),
            revisionNumber: 1,
          },
        });
        draftId = created.id;
      }

      const draft = await tx.tournamentComposerDraft.findFirstOrThrow({
        where: { id: draftId!, tenantId: input.tenantId },
      });

      await tx.sceActivityGovernanceRevision.updateMany({
        where: { tournamentDraftId: draft.id, isCurrentSubmission: true },
        data: { isCurrentSubmission: false },
      });

      const revision = await tx.sceActivityGovernanceRevision.create({
        data: {
          tenantId: input.tenantId,
          activityType: "TOURNAMENT",
          tournamentDraftId: draft.id,
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

  const published = await createTournamentFromComposerPayload({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    payload: input.payload,
    reviewStage: "APPROVED",
  });

  if (input.draftId) {
    await prisma.tournamentComposerDraft.updateMany({
      where: { id: input.draftId, tenantId: input.tenantId },
      data: {
        lifecycleState: "PUBLISHED",
        publishedPrimaryEventId: published.eventId,
      },
    });
  }

  return { outcome: "PUBLISHED", eventId: published.eventId };
}

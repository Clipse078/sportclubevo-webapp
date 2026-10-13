import { prisma } from "@/lib/db/prisma";
import {
  assertApproverMayDecide,
  isApprovalCompleteForRevision,
} from "@/lib/sce/activity-governance/approval-rules";
import type { SceActivityEffectiveGovernance } from "@/lib/sce/activity-governance/types";
import { commitTrainingComposerDraft } from "./training-commit-service";
import type { TrainingComposerDraftPayload } from "./training-composer-draft-types";

export async function recordTrainingApprovalDecision(input: {
  tenantId: string;
  revisionId: string;
  approverPersonId: string;
  decision: "APPROVE" | "REQUEST_CHANGES" | "REJECT";
  comment?: string;
  actorUserId: string;
  approverHeldApprovePermission: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const revision = await prisma.sceActivityGovernanceRevision.findFirst({
    where: {
      id: input.revisionId,
      tenantId: input.tenantId,
      activityType: "TRAINING",
      isCurrentSubmission: true,
      lifecycleState: "PENDING_APPROVAL",
    },
    include: { trainingDraft: true },
  });

  if (!revision?.trainingDraft) {
    return { ok: false, error: "Einreichung nicht mehr aktuell oder bereits bearbeitet." };
  }

  const policySnapshot = revision.policySnapshot as {
    validatorPersonIds?: string[];
  };
  const validatorIds = policySnapshot.validatorPersonIds ?? [];
  const approverIsValidator = validatorIds.includes(input.approverPersonId);

  const guard = assertApproverMayDecide({
    approverPersonId: input.approverPersonId,
    creatorPersonId: revision.creatorPersonId,
    decision: input.decision,
    approverIsAuthorizedValidator:
      approverIsValidator && input.approverHeldApprovePermission,
  });

  if (!guard.ok) {
    if (guard.reason === "SELF_APPROVAL_DENIED") {
      return { ok: false, error: "Eigene Einreichungen können nicht freigegeben werden." };
    }
    return { ok: false, error: "Keine Berechtigung für diese Freigabeentscheidung." };
  }

  if (input.decision === "REQUEST_CHANGES" && !input.comment?.trim()) {
    return { ok: false, error: "Bitte geben Sie einen Kommentar für die Änderungsanforderung an." };
  }
  if (input.decision === "REJECT" && !input.comment?.trim()) {
    return { ok: false, error: "Bitte geben Sie einen Ablehnungsgrund an." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.sceActivityGovernanceDecision.create({
        data: {
          tenantId: input.tenantId,
          revisionId: revision.id,
          decision: input.decision,
          approverPersonId: input.approverPersonId,
          comment: input.comment?.trim() || null,
        },
      });

      if (input.decision === "APPROVE") {
        const approvePersonIds = [input.approverPersonId];
        if (!isApprovalCompleteForRevision({ strategy: "ANY_ONE", approvePersonIds })) {
          return;
        }

        await tx.sceActivityGovernanceRevision.update({
          where: { id: revision.id },
          data: { lifecycleState: "PUBLISHED", publishedAt: new Date() },
        });
        await tx.trainingComposerDraft.update({
          where: { id: revision.trainingDraftId! },
          data: { lifecycleState: "PUBLISHED" },
        });
      } else if (input.decision === "REQUEST_CHANGES") {
        await tx.sceActivityGovernanceRevision.update({
          where: { id: revision.id },
          data: { lifecycleState: "CHANGES_REQUESTED", isCurrentSubmission: false },
        });
        await tx.trainingComposerDraft.update({
          where: { id: revision.trainingDraftId! },
          data: { lifecycleState: "CHANGES_REQUESTED" },
        });
      } else {
        await tx.sceActivityGovernanceRevision.update({
          where: { id: revision.id },
          data: { lifecycleState: "REJECTED", isCurrentSubmission: false },
        });
        await tx.trainingComposerDraft.update({
          where: { id: revision.trainingDraftId! },
          data: { lifecycleState: "REJECTED" },
        });
      }
    });
  } catch {
    return { ok: false, error: "Freigabeentscheidung konnte nicht gespeichert werden." };
  }

  if (input.decision === "APPROVE") {
    const payload = revision.payloadSnapshot as TrainingComposerDraftPayload;
    const effectiveGovernance: SceActivityEffectiveGovernance = {
      activityType: "TRAINING",
      personId: revision.creatorPersonId,
      mayCreate: true,
      publicationAuthority: "DIRECT_PUBLISH",
      approvalStrategy: "ANY_ONE",
      validatorPersonIds: validatorIds,
    };
    const published = await commitTrainingComposerDraft({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      actorPersonId: revision.creatorPersonId,
      payload,
      draftId: revision.trainingDraftId,
      effectiveGovernance,
    });
    if (published.outcome !== "PUBLISHED") {
      return { ok: false, error: "Veröffentlichung nach Freigabe fehlgeschlagen." };
    }
    await prisma.trainingComposerDraft.update({
      where: { id: revision.trainingDraftId! },
      data: { publishedPrimarySeriesId: published.seriesId },
    });
  }

  return { ok: true };
}

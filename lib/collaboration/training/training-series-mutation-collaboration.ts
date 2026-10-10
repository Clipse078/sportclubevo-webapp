/**
 * SCE-COLLAB-01D — multi-activity impact after training series schedule mutations.
 */

import { randomUUID } from "node:crypto";
import { defaultTeamOperationalAudience } from "@/lib/communication/platform/seams/team-communication-seam";
import type { MultiActivityChangeImpact } from "@/lib/collaboration/multi-activity/types";
import {
  buildMultiActivityChangeImpact,
  mergeAtomicImpactsIntoItems,
} from "@/lib/collaboration/multi-activity/group-multi-activity-impact";
import {
  getMultiActivityDispatchPreviewCallCountForTests,
  resolveMultiActivityTrainingDispatchPreview,
  resolveMultiActivityTrainingDispatchPreviewByAudienceGroups,
} from "@/lib/collaboration/multi-activity/multi-activity-dispatch-preview";
import { buildTrainingActivityChangeImpact } from "@/lib/collaboration/training/training-activity-change";
import type { TrainingActivitySnapshot } from "@/lib/collaboration/training/training-activity-snapshot";
import { loadTrainingSeriesActivitySnapshots } from "@/lib/collaboration/training/load-training-series-activity-snapshots";
import { resolveContextualCommunicationSendAuthorization } from "@/lib/collaboration/contextual-communication-authorization";

export { getMultiActivityDispatchPreviewCallCountForTests };

export async function buildTrainingSeriesMutationCollaborationImpact(input: {
  tenantId: string;
  tenantKey: string;
  userId: string;
  trainingSeriesId: string;
  beforeSnapshots: Map<string, TrainingActivitySnapshot>;
  locale?: string;
  batchOperationId?: string;
}): Promise<MultiActivityChangeImpact | null> {
  try {
    const afterSnapshots = await loadTrainingSeriesActivitySnapshots({
      tenantId: input.tenantId,
      trainingSeriesId: input.trainingSeriesId,
      locale: input.locale,
    });

    const unionSessionIds = new Set<string>([
      ...input.beforeSnapshots.keys(),
      ...afterSnapshots.keys(),
    ]);

    const firstAfter = afterSnapshots.values().next().value as TrainingActivitySnapshot | undefined;
    if (!firstAfter) return null;

    const { canCommunicate } = await resolveContextualCommunicationSendAuthorization({
      tenantId: input.tenantId,
      tenantKey: input.tenantKey,
      userId: input.userId,
      teamId: firstAfter.teamId,
    });

    const teamAudienceStub = {
      teamId: firstAfter.teamId,
      teamName: firstAfter.teamName,
      recipientPreviewLabel: null as string | null,
      effectiveRecipientCount: null as number | null,
      zeroRecipients: false,
    };

    const atomicResults: Array<{
      activityId: string;
      impact: ReturnType<typeof buildTrainingActivityChangeImpact> | null;
    }> = [];

    for (const sessionId of unionSessionIds) {
      const before = input.beforeSnapshots.get(sessionId);
      const after = afterSnapshots.get(sessionId);
      if (!before || !after) continue;

      const impact = buildTrainingActivityChangeImpact({
        before,
        after,
        canCommunicate,
        audience: {
          ...teamAudienceStub,
          teamId: after.teamId,
          teamName: after.teamName,
        },
      });
      atomicResults.push({ activityId: sessionId, impact: impact.worthy ? impact : null });
    }

    const items = mergeAtomicImpactsIntoItems(atomicResults);
    if (items.length === 0) return null;

    const teamId = items[0]!.impact.audience?.teamId;
    const teamName = items[0]!.impact.audience?.teamName ?? "Team";
    if (!teamId) return null;

    const canCommunicateCombined = canCommunicate && items.every((item) => item.impact.canCommunicate);

    let effectiveRecipientCount: number | null = null;
    let zeroRecipients = false;
    let recipientPreviewLabel: string | null = null;

    if (canCommunicateCombined) {
      const teamIds = new Set(
        items
          .map((item) => item.impact.audience?.teamId)
          .filter((id): id is string => Boolean(id)),
      );

      if (teamIds.size <= 1) {
        const preview = await resolveMultiActivityTrainingDispatchPreview({
          tenantId: input.tenantId,
          senderUserId: input.userId,
          sessionIds: items.map((item) => item.activityId),
          audience: defaultTeamOperationalAudience(teamId),
        });
        effectiveRecipientCount = preview.recipientCount;
        zeroRecipients = preview.recipientCount === 0;
      } else {
        const groups = [...teamIds].map((id) => ({
          audienceKey: id,
          audience: defaultTeamOperationalAudience(id),
          sessionIds: items
            .filter((item) => item.impact.audience?.teamId === id)
            .map((item) => item.activityId),
        }));
        const preview = await resolveMultiActivityTrainingDispatchPreviewByAudienceGroups({
          tenantId: input.tenantId,
          senderUserId: input.userId,
          groups,
        });
        effectiveRecipientCount = preview.recipientCount;
        zeroRecipients = preview.recipientCount === 0;
      }

      recipientPreviewLabel =
        effectiveRecipientCount !== null && effectiveRecipientCount > 0
          ? `${teamName} · ${effectiveRecipientCount} Empfänger`
          : teamName;
    }

    return buildMultiActivityChangeImpact({
      batchOperationId: input.batchOperationId ?? randomUUID(),
      items,
      canCommunicate: canCommunicateCombined,
      audience: {
        teamId,
        teamName,
        recipientPreviewLabel,
        effectiveRecipientCount,
        zeroRecipients,
      },
    });
  } catch {
    return null;
  }
}

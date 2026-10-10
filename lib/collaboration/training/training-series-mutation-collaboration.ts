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
import { resolveMultiActivityTrainingDispatchPreview } from "@/lib/collaboration/multi-activity/multi-activity-dispatch-preview";
import { resolveTrainingCollaborationImpactAfterChange } from "@/lib/collaboration/training/training-collaboration-impact-service";
import type { TrainingActivitySnapshot } from "@/lib/collaboration/training/training-activity-snapshot";
import { loadTrainingActivitySnapshot } from "@/lib/collaboration/training/training-activity-snapshot";
import { listTrainingSessionIdsForSeries } from "@/lib/collaboration/training/load-training-series-activity-snapshots";

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
    const sessionIds = await listTrainingSessionIdsForSeries({
      tenantId: input.tenantId,
      trainingSeriesId: input.trainingSeriesId,
    });

    const unionSessionIds = new Set<string>([
      ...input.beforeSnapshots.keys(),
      ...sessionIds,
    ]);

    const atomicResults: Array<{
      activityId: string;
      impact: Awaited<ReturnType<typeof resolveTrainingCollaborationImpactAfterChange>>;
    }> = [];

    for (const sessionId of unionSessionIds) {
      const before = input.beforeSnapshots.get(sessionId);
      const after = await loadTrainingActivitySnapshot({
        tenantId: input.tenantId,
        sessionId,
        locale: input.locale,
      });
      if (!before || !after) continue;

      const impact = await resolveTrainingCollaborationImpactAfterChange({
        tenantId: input.tenantId,
        tenantKey: input.tenantKey,
        userId: input.userId,
        before,
        after,
      });
      atomicResults.push({ activityId: sessionId, impact });
    }

    const items = mergeAtomicImpactsIntoItems(atomicResults);
    if (items.length === 0) return null;

    const teamId = items[0]!.impact.audience?.teamId;
    const teamName = items[0]!.impact.audience?.teamName ?? "Team";
    if (!teamId) return null;

    const canCommunicate = items.every((item) => item.impact.canCommunicate);

    let effectiveRecipientCount: number | null = null;
    let zeroRecipients = false;
    let recipientPreviewLabel: string | null = null;

    if (canCommunicate) {
      const preview = await resolveMultiActivityTrainingDispatchPreview({
        tenantId: input.tenantId,
        senderUserId: input.userId,
        sessionIds: items.map((item) => item.activityId),
        audience: defaultTeamOperationalAudience(teamId),
      });
      effectiveRecipientCount = preview.recipientCount;
      zeroRecipients = preview.recipientCount === 0;
      recipientPreviewLabel =
        preview.recipientCount > 0
          ? `${teamName} · ${preview.recipientCount} Empfänger`
          : teamName;
    }

    return buildMultiActivityChangeImpact({
      batchOperationId: input.batchOperationId ?? randomUUID(),
      items,
      canCommunicate,
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

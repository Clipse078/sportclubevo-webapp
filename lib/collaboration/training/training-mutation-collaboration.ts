import type { ActivityCollaborationMutationResult } from "@/lib/collaboration/activity-change/collaboration-mutation-result";
import {
  mergeTrainingCycleBaselineWithAfter,
  trainingSnapshotToCycleBaseline,
  type TrainingCollaborationCycleBaseline,
} from "@/lib/collaboration/activity-change/cycle-baseline";
import { finalizeCollaborationMutationCycle } from "@/lib/collaboration/activity-change/resolve-mutation-collaboration-cycle";
import { loadTrainingActivitySnapshot } from "@/lib/collaboration/training/training-activity-snapshot";
import { resolveTrainingCollaborationImpactAfterChange } from "@/lib/collaboration/training/training-collaboration-impact-service";

export async function buildTrainingMutationCollaborationImpact(input: {
  tenantId: string;
  tenantKey: string;
  userId: string;
  sessionId: string;
  locale?: string;
  beforeSnapshot: Awaited<ReturnType<typeof loadTrainingActivitySnapshot>>;
  cycleBaseline?: TrainingCollaborationCycleBaseline | null;
}): Promise<ActivityCollaborationMutationResult> {
  const cycleRequested = Boolean(input.cycleBaseline);

  try {
    if (!input.beforeSnapshot) {
      return { impact: null, cycleBaseline: null };
    }

    const after = await loadTrainingActivitySnapshot({
      tenantId: input.tenantId,
      sessionId: input.sessionId,
      locale: input.locale,
    });
    if (!after) return { impact: null, cycleBaseline: null };

    const effectiveBefore = input.cycleBaseline
      ? mergeTrainingCycleBaselineWithAfter(input.cycleBaseline, after)
      : input.beforeSnapshot;

    const impact = await resolveTrainingCollaborationImpactAfterChange({
      tenantId: input.tenantId,
      tenantKey: input.tenantKey,
      userId: input.userId,
      before: effectiveBefore,
      after,
    });

    const initialCycleBaseline = trainingSnapshotToCycleBaseline(effectiveBefore);

    return finalizeCollaborationMutationCycle({
      cycleRequested,
      impact,
      cycleBaseline: input.cycleBaseline ?? null,
      initialCycleBaseline,
    });
  } catch {
    return { impact: null, cycleBaseline: null };
  }
}

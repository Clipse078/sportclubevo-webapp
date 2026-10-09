import type { ActivityCollaborationMutationResult } from "@/lib/collaboration/activity-change/collaboration-mutation-result";
import {
  mergeMatchCycleBaselineWithAfter,
  matchSnapshotToCycleBaseline,
  type MatchCollaborationCycleBaseline,
} from "@/lib/collaboration/activity-change/cycle-baseline";
import { finalizeCollaborationMutationCycle } from "@/lib/collaboration/activity-change/resolve-mutation-collaboration-cycle";
import { loadMatchActivitySnapshot } from "@/lib/collaboration/match/match-activity-snapshot";
import { resolveMatchCollaborationImpactAfterChange } from "@/lib/collaboration/match/match-collaboration-impact-service";

export async function buildMatchMutationCollaborationImpact(input: {
  tenantId: string;
  tenantKey: string;
  userId: string;
  matchId: string;
  locale?: string;
  beforeSnapshot: Awaited<ReturnType<typeof loadMatchActivitySnapshot>>;
  cycleBaseline?: MatchCollaborationCycleBaseline | null;
}): Promise<ActivityCollaborationMutationResult> {
  const cycleRequested = Boolean(input.cycleBaseline);

  try {
    if (!input.beforeSnapshot) {
      return { impact: null, cycleBaseline: null };
    }

    const after = await loadMatchActivitySnapshot({
      tenantId: input.tenantId,
      matchId: input.matchId,
      locale: input.locale,
    });
    if (!after) return { impact: null, cycleBaseline: null };

    const effectiveBefore = input.cycleBaseline
      ? mergeMatchCycleBaselineWithAfter(input.cycleBaseline, after)
      : input.beforeSnapshot;

    const impact = await resolveMatchCollaborationImpactAfterChange({
      tenantId: input.tenantId,
      tenantKey: input.tenantKey,
      userId: input.userId,
      before: effectiveBefore,
      after,
    });

    const initialCycleBaseline = matchSnapshotToCycleBaseline(effectiveBefore);

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

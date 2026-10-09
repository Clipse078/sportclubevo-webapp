import type { ActivityCollaborationMutationResult } from "@/lib/collaboration/activity-change/collaboration-mutation-result";
import {
  clubEventSnapshotToCycleBaseline,
  mergeClubEventCycleBaselineWithAfter,
  type ClubEventCollaborationCycleBaseline,
} from "@/lib/collaboration/activity-change/cycle-baseline";
import { finalizeCollaborationMutationCycle } from "@/lib/collaboration/activity-change/resolve-mutation-collaboration-cycle";
import { loadClubEventActivitySnapshot } from "@/lib/collaboration/club-event/club-event-activity-snapshot";
import { resolveClubEventCollaborationImpactAfterChange } from "@/lib/collaboration/club-event/club-event-collaboration-impact-service";

export async function buildClubEventMutationCollaborationImpact(input: {
  tenantId: string;
  tenantKey: string;
  userId: string;
  eventId: string;
  locale?: string;
  beforeSnapshot: Awaited<ReturnType<typeof loadClubEventActivitySnapshot>>;
  cycleBaseline?: ClubEventCollaborationCycleBaseline | null;
}): Promise<ActivityCollaborationMutationResult> {
  const cycleRequested = Boolean(input.cycleBaseline);

  try {
    if (!input.beforeSnapshot) {
      return { impact: null, cycleBaseline: null };
    }

    const after = await loadClubEventActivitySnapshot({
      tenantId: input.tenantId,
      eventId: input.eventId,
      locale: input.locale,
    });
    if (!after) return { impact: null, cycleBaseline: null };

    const effectiveBefore = input.cycleBaseline
      ? mergeClubEventCycleBaselineWithAfter(input.cycleBaseline, after)
      : input.beforeSnapshot;

    const impact = await resolveClubEventCollaborationImpactAfterChange({
      tenantId: input.tenantId,
      tenantKey: input.tenantKey,
      userId: input.userId,
      before: effectiveBefore,
      after,
    });

    const initialCycleBaseline = clubEventSnapshotToCycleBaseline(effectiveBefore);

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

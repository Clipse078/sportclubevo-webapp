import type { ActivityCollaborationMutationResult } from "@/lib/collaboration/activity-change/collaboration-mutation-result";
import {
  mergeTournamentCycleBaselineWithAfter,
  tournamentSnapshotToCycleBaseline,
  type TournamentCollaborationCycleBaseline,
} from "@/lib/collaboration/activity-change/cycle-baseline";
import { finalizeCollaborationMutationCycle } from "@/lib/collaboration/activity-change/resolve-mutation-collaboration-cycle";
import { loadTournamentActivitySnapshot } from "@/lib/collaboration/tournament/tournament-activity-snapshot";
import { resolveTournamentCollaborationImpactAfterChange } from "@/lib/collaboration/tournament/tournament-collaboration-impact-service";

export async function buildTournamentMutationCollaborationImpact(input: {
  tenantId: string;
  tenantKey: string;
  userId: string;
  tournamentId: string;
  locale?: string;
  beforeSnapshot: Awaited<ReturnType<typeof loadTournamentActivitySnapshot>>;
  cycleBaseline?: TournamentCollaborationCycleBaseline | null;
}): Promise<ActivityCollaborationMutationResult> {
  const cycleRequested = Boolean(input.cycleBaseline);

  try {
    if (!input.beforeSnapshot) {
      return { impact: null, cycleBaseline: null };
    }

    const after = await loadTournamentActivitySnapshot({
      tenantId: input.tenantId,
      tournamentId: input.tournamentId,
      locale: input.locale,
    });
    if (!after) return { impact: null, cycleBaseline: null };

    const effectiveBefore = input.cycleBaseline
      ? mergeTournamentCycleBaselineWithAfter(input.cycleBaseline, after)
      : input.beforeSnapshot;

    const impact = await resolveTournamentCollaborationImpactAfterChange({
      tenantId: input.tenantId,
      tenantKey: input.tenantKey,
      userId: input.userId,
      before: effectiveBefore,
      after,
    });

    const initialCycleBaseline = tournamentSnapshotToCycleBaseline(effectiveBefore);

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

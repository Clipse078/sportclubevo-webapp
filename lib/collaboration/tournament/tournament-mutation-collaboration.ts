import type { ActivityChangeImpact } from "@/lib/collaboration/activity-change/types";
import { loadTournamentActivitySnapshot } from "@/lib/collaboration/tournament/tournament-activity-snapshot";
import { resolveTournamentCollaborationImpactAfterChange } from "@/lib/collaboration/tournament/tournament-collaboration-impact-service";

export async function buildTournamentMutationCollaborationImpact(input: {
  tenantId: string;
  tenantKey: string;
  userId: string;
  tournamentId: string;
  locale?: string;
  beforeSnapshot: Awaited<ReturnType<typeof loadTournamentActivitySnapshot>>;
}): Promise<ActivityChangeImpact | null> {
  try {
    if (!input.beforeSnapshot) return null;

    const after = await loadTournamentActivitySnapshot({
      tenantId: input.tenantId,
      tournamentId: input.tournamentId,
      locale: input.locale,
    });
    if (!after) return null;

    return await resolveTournamentCollaborationImpactAfterChange({
      tenantId: input.tenantId,
      tenantKey: input.tenantKey,
      userId: input.userId,
      before: input.beforeSnapshot,
      after,
    });
  } catch {
    return null;
  }
}

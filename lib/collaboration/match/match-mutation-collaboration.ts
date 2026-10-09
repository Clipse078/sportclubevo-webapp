import type { ActivityChangeImpact } from "@/lib/collaboration/activity-change/types";
import { loadMatchActivitySnapshot } from "@/lib/collaboration/match/match-activity-snapshot";
import { resolveMatchCollaborationImpactAfterChange } from "@/lib/collaboration/match/match-collaboration-impact-service";

export async function buildMatchMutationCollaborationImpact(input: {
  tenantId: string;
  tenantKey: string;
  userId: string;
  matchId: string;
  locale?: string;
  beforeSnapshot: Awaited<ReturnType<typeof loadMatchActivitySnapshot>>;
}): Promise<ActivityChangeImpact | null> {
  try {
    if (!input.beforeSnapshot) return null;

    const after = await loadMatchActivitySnapshot({
      tenantId: input.tenantId,
      matchId: input.matchId,
      locale: input.locale,
    });
    if (!after) return null;

    return await resolveMatchCollaborationImpactAfterChange({
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

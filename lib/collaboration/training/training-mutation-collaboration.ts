import type { ActivityChangeImpact } from "@/lib/collaboration/activity-change/types";
import { loadTrainingActivitySnapshot } from "@/lib/collaboration/training/training-activity-snapshot";
import { resolveTrainingCollaborationImpactAfterChange } from "@/lib/collaboration/training/training-collaboration-impact-service";

export async function buildTrainingMutationCollaborationImpact(input: {
  tenantId: string;
  tenantKey: string;
  userId: string;
  sessionId: string;
  locale?: string;
  beforeSnapshot: Awaited<ReturnType<typeof loadTrainingActivitySnapshot>>;
}): Promise<ActivityChangeImpact | null> {
  try {
    if (!input.beforeSnapshot) return null;

    const after = await loadTrainingActivitySnapshot({
      tenantId: input.tenantId,
      sessionId: input.sessionId,
      locale: input.locale,
    });
    if (!after) return null;

    return await resolveTrainingCollaborationImpactAfterChange({
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

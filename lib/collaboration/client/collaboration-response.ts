import type { ActivityCollaborationDomain } from "@/lib/collaboration/activity-change/types";
import type { ActivityChangeImpact } from "@/lib/collaboration/activity-change/types";
import type { CollaborationCycleBaseline } from "@/lib/collaboration/activity-change/cycle-baseline";

export type CollaborationMutationPayload = {
  collaboration?: ActivityChangeImpact | null;
  collaborationCycleBaseline?: unknown;
};

export function extractCollaborationImpact(payload: unknown): ActivityChangeImpact | null {
  if (!payload || typeof payload !== "object") return null;
  const collaboration = (payload as CollaborationMutationPayload).collaboration;
  if (!collaboration?.worthy || !collaboration.changeSet) return null;
  return collaboration;
}

export function extractCollaborationCycleBaseline(
  payload: unknown,
): CollaborationCycleBaseline["baseline"] | null {
  if (!payload || typeof payload !== "object") return null;
  const baseline = (payload as CollaborationMutationPayload).collaborationCycleBaseline;
  if (!baseline || typeof baseline !== "object") return null;
  return baseline as CollaborationCycleBaseline["baseline"];
}

export function withCollaborationCycleBaseline(
  body: Record<string, unknown>,
  baseline: CollaborationCycleBaseline["baseline"] | null | undefined,
): Record<string, unknown> {
  if (!baseline) return body;
  return { ...body, collaborationCycleBaseline: baseline };
}

export type ApplyCollaborationMutationOptions = {
  domain: ActivityCollaborationDomain;
  activityId: string;
  /** True when the outgoing request included an active cycle baseline. */
  cycleRequested: boolean;
};

export type ApplyCollaborationMutationHandlers = {
  setImpact: (impact: ActivityChangeImpact | null) => void;
  setCycleBaseline: (
    domain: ActivityCollaborationDomain,
    activityId: string,
    baseline: CollaborationCycleBaseline["baseline"] | null,
  ) => void;
  getExistingCycleBaseline?: () => CollaborationCycleBaseline["baseline"] | undefined;
};

export function applyCollaborationMutationResponse(
  payload: unknown,
  options: ApplyCollaborationMutationOptions,
  handlers: ApplyCollaborationMutationHandlers,
): void {
  const impact = extractCollaborationImpact(payload);
  const cycleBaseline = extractCollaborationCycleBaseline(payload);

  if (impact) {
    handlers.setImpact(impact);
    const baselineToStore = cycleBaseline ?? handlers.getExistingCycleBaseline?.();
    if (baselineToStore) {
      handlers.setCycleBaseline(options.domain, options.activityId, baselineToStore);
    }
    return;
  }

  if (options.cycleRequested) {
    handlers.setImpact(null);
    handlers.setCycleBaseline(options.domain, options.activityId, null);
  }
}

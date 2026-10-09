"use client";

import { useCallback } from "react";
import type { ActivityCollaborationDomain } from "@/lib/collaboration/activity-change/types";
import {
  applyCollaborationMutationResponse,
  withCollaborationCycleBaseline,
} from "@/lib/collaboration/client/collaboration-response";
import { useActivityChangeCollaboration } from "@/components/admin/collaboration/ActivityChangeCollaborationContext";

export function useCollaborationMutation(domain: ActivityCollaborationDomain, activityId: string) {
  const { setImpact, setCycleBaseline, getCycleBaselineForRequest } =
    useActivityChangeCollaboration();

  const attachCycleBaseline = useCallback(
    (body: Record<string, unknown>) => {
      const baseline = getCycleBaselineForRequest(domain, activityId);
      return { payload: withCollaborationCycleBaseline(body, baseline), cycleRequested: Boolean(baseline) };
    },
    [activityId, domain, getCycleBaselineForRequest],
  );

  const applyMutationCollaboration = useCallback(
    (responsePayload: unknown, cycleRequested: boolean) => {
      applyCollaborationMutationResponse(
        responsePayload,
        { domain, activityId, cycleRequested },
        { setImpact, setCycleBaseline },
      );
    },
    [activityId, domain, setCycleBaseline, setImpact],
  );

  return { attachCycleBaseline, applyMutationCollaboration };
}

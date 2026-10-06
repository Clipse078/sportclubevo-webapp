"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { actorFromManipulationContext } from "@/lib/planning-hub/conflict-resolution";
import type { ManipulationPermissionContext } from "@/lib/planning-hub/manipulation-capabilities";
import { canCancelTrainingActivity } from "@/lib/planning-hub/training-activity-cancellation";
import type { WeekplannerItem } from "@/lib/weekplanner/types";
import { usePlanningHubPlannerWeek } from "./PlanningHubPlannerWeekContext";
import PlanningHubTrainingActivityCancellationDialog from "./PlanningHubTrainingActivityCancellationDialog";

type Props = {
  item: WeekplannerItem;
  locale: string;
  timezone: string;
  permissionContext: Pick<
    ManipulationPermissionContext,
    "canManageTrainings" | "canManageEvents" | "canManageAllocations"
  >;
  testIdPrefix?: string;
  onTrainingCancelled?: (trainingSessionId: string) => void;
  onTrainingCancellationRefreshFailed?: (message: string) => void;
};

export default function PlanningHubActivityActions({
  item,
  locale,
  timezone,
  permissionContext,
  testIdPrefix = "planning-hub-activity",
  onTrainingCancelled,
  onTrainingCancellationRefreshFailed,
}: Props) {
  const plannerWeek = usePlanningHubPlannerWeek();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const actor = useMemo(() => actorFromManipulationContext(permissionContext), [permissionContext]);
  const showTrainingCancel = canCancelTrainingActivity(item, actor);
  const cancelTestId = `${testIdPrefix}-cancel-training`;

  if (!showTrainingCancel) return null;

  return (
    <>
      <div className="mt-4" data-testid={`${testIdPrefix}-actions`}>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          data-testid={cancelTestId}
          onClick={() => setCancelDialogOpen(true)}
        >
          Training absagen
        </Button>
      </div>
      {cancelDialogOpen && (
        <PlanningHubTrainingActivityCancellationDialog
          training={item}
          locale={locale}
          timezone={timezone}
          testId={`${cancelTestId}-dialog`}
          onClose={() => setCancelDialogOpen(false)}
          onCancelled={(sessionId) => {
            onTrainingCancelled?.(sessionId);
            plannerWeek?.notifyTrainingSessionCancelled(sessionId);
          }}
          onRefreshFailed={(message) => {
            onTrainingCancellationRefreshFailed?.(message);
            plannerWeek?.reportPlannerSyncWarning(message);
          }}
        />
      )}
    </>
  );
}

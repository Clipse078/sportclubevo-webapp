"use client";

import { Button } from "@/components/ui/Button";
import {
  deriveConflictResolutionCapabilities,
  segmentIdForResource,
  type ConflictResolutionCapabilities,
} from "@/lib/planning-hub/conflict-resolution";
import type { ManipulationPermissionContext } from "@/lib/planning-hub/manipulation-capabilities";
import type { WeekplannerConflict, WeekplannerItem } from "@/lib/weekplanner/types";
import { usePlanningHubManipulation } from "./PlanningHubManipulationContext";

type Props = {
  item: WeekplannerItem;
  conflict: WeekplannerConflict;
  permissionContext: Pick<
    ManipulationPermissionContext,
    | "canManageTrainings"
    | "canManageEvents"
    | "canManageAllocations"
    | "isStandardplan"
    | "alternativePlanId"
  >;
  onOpenItem: (item: WeekplannerItem) => void;
  onEditItem?: (item: WeekplannerItem) => void;
  canEditItem?: (item: WeekplannerItem) => boolean;
  testIdPrefix?: string;
};

function capsForConflict(
  caps: ConflictResolutionCapabilities,
  conflict: WeekplannerConflict,
): {
  showPitch: boolean;
  showDressing: boolean;
  showTime: boolean;
} {
  const kind = conflict.resourceKind === "DRESSING_ROOM" ? "DRESSING_ROOM" : "PITCH_HALL";
  return {
    showPitch: kind === "PITCH_HALL" && caps.canChangePrimaryResource,
    showDressing: kind === "DRESSING_ROOM" && caps.canChangeSupportingResource,
    showTime: caps.canMoveActivityTime,
  };
}

export default function PlanningHubConflictResolutionActions({
  item,
  conflict,
  permissionContext,
  onOpenItem,
  onEditItem,
  canEditItem,
  testIdPrefix = "conflict-resolution",
}: Props) {
  const manipulation = usePlanningHubManipulation();
  const caps = deriveConflictResolutionCapabilities(item, permissionContext, {
    canEditActivity: canEditItem ? canEditItem(item) : undefined,
  });
  const prioritized = capsForConflict(caps, conflict);
  const resourceId = conflict.facilityResourceId;
  const prefix = `${testIdPrefix}-${item.id}-${resourceId}`;

  const showEdit =
    onEditItem &&
    caps.canEditActivity &&
    (canEditItem ? canEditItem(item) : true) &&
    !prioritized.showPitch &&
    !prioritized.showDressing &&
    !prioritized.showTime;

  if (
    !prioritized.showPitch &&
    !prioritized.showDressing &&
    !prioritized.showTime &&
    !caps.canOpenActivity &&
    !showEdit
  ) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2" data-testid={`${prefix}-actions`}>
      {prioritized.showPitch && manipulation && (
        <Button
          type="button"
          variant="primary"
          size="sm"
          data-testid={`${prefix}-change-pitch`}
          onClick={() =>
            manipulation.openResourceEditorForConflict(
              item,
              resourceId,
              "pitch",
            )
          }
        >
          Spielfeld ändern
        </Button>
      )}
      {prioritized.showDressing && manipulation && (
        <Button
          type="button"
          variant="primary"
          size="sm"
          data-testid={`${prefix}-change-dressing`}
          onClick={() =>
            manipulation.openResourceEditorForConflict(
              item,
              resourceId,
              "dressing",
            )
          }
        >
          Garderobe ändern
        </Button>
      )}
      {prioritized.showTime && manipulation && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          data-testid={`${prefix}-change-time`}
          onClick={() => manipulation.openActivityScheduleEditorForConflict(item)}
        >
          Termin ändern
        </Button>
      )}
      {!prioritized.showTime && caps.activityTimeBlockedReason && (
        <p className="w-full text-xs text-[var(--text-2)]" data-testid={`${prefix}-time-blocked`}>
          {caps.activityTimeBlockedReason}
        </p>
      )}
      {caps.canOpenActivity && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          data-testid={`${prefix}-open`}
          onClick={() => onOpenItem(item)}
        >
          Öffnen
        </Button>
      )}
      {showEdit && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          data-testid={`${prefix}-edit`}
          onClick={() => onEditItem!(item)}
        >
          Bearbeiten
        </Button>
      )}
    </div>
  );
}

export { deriveConflictResolutionCapabilities, segmentIdForResource };

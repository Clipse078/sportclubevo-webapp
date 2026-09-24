"use client";

/**
 * PLANNING-UX-07R4 — match Heim/Gast dressing-room rows with merged side availability.
 */

import { useMemo } from "react";
import type { FacilityGroup, ResourceAvailabilityAnnotation } from "@/components/admin/training/FacilityResourceSelector";
import { mergeMatchDressingRoomSideAvailability } from "@/lib/planning/resource-occupancy-presentation";
import { PlanningSubjectDressingRoomAssignments } from "@/components/admin/shared/planning/PlanningSubjectDressingRoomAssignments";

function resourceNameFromGroups(groups: FacilityGroup[], code: string): string {
  for (const fg of groups) {
    const resource = fg.resources.find((r) => r.id === code);
    if (resource) return resource.name;
  }
  return code;
}

export type PlanningMatchDressingRoomAssignmentsProps = {
  homeLabel: string;
  awayLabel: string;
  homeCode: string | null | undefined;
  awayCode: string | null | undefined;
  homeDisplayName: string;
  awayDisplayName: string;
  canManage: boolean;
  disabled?: boolean;
  facilityGroups: FacilityGroup[];
  dressingRoomAvailability?: Map<string, ResourceAvailabilityAnnotation>;
  onSelectHome: (code: string) => void | Promise<void>;
  onSelectAway: (code: string) => void | Promise<void>;
  onDeselectHome?: (code: string) => void | Promise<void>;
  onDeselectAway?: (code: string) => void | Promise<void>;
  testId?: string;
};

export function PlanningMatchDressingRoomAssignments({
  homeLabel,
  awayLabel,
  homeCode,
  awayCode,
  homeDisplayName,
  awayDisplayName,
  canManage,
  disabled,
  facilityGroups,
  dressingRoomAvailability,
  onSelectHome,
  onSelectAway,
  onDeselectHome,
  onDeselectAway,
  testId = "match-dressing-room-assignments",
}: PlanningMatchDressingRoomAssignmentsProps) {
  const availabilityBySubjectId = useMemo(() => {
    const homeMap = mergeMatchDressingRoomSideAvailability(dressingRoomAvailability, {
      homeCode,
      awayCode,
      homeLabel: homeDisplayName,
      awayLabel: awayDisplayName,
      editingSide: "home",
    });
    const awayMap = mergeMatchDressingRoomSideAvailability(dressingRoomAvailability, {
      homeCode,
      awayCode,
      homeLabel: homeDisplayName,
      awayLabel: awayDisplayName,
      editingSide: "away",
    });
    return new Map<string, Map<string, ResourceAvailabilityAnnotation>>([
      ["home", homeMap],
      ["away", awayMap],
    ]);
  }, [awayCode, awayDisplayName, dressingRoomAvailability, homeCode, homeDisplayName]);

  const subjects = useMemo(
    () => [
      {
        id: "home",
        displayName: homeLabel,
        secondaryLabel: homeDisplayName,
        dressingRoomAllocations: homeCode?.trim()
          ? [
              {
                facilityResourceId: homeCode.trim(),
                facilityResourceName: resourceNameFromGroups(facilityGroups, homeCode.trim()),
              },
            ]
          : [],
      },
      {
        id: "away",
        displayName: awayLabel,
        secondaryLabel: awayDisplayName,
        dressingRoomAllocations: awayCode?.trim()
          ? [
              {
                facilityResourceId: awayCode.trim(),
                facilityResourceName: resourceNameFromGroups(facilityGroups, awayCode.trim()),
              },
            ]
          : [],
      },
    ],
    [awayCode, awayDisplayName, awayLabel, facilityGroups, homeCode, homeDisplayName, homeLabel],
  );

  return (
    <PlanningSubjectDressingRoomAssignments
      subjects={subjects}
      canManage={canManage}
      facilityGroups={facilityGroups}
      dressingRoomAvailability={dressingRoomAvailability}
      availabilityBySubjectId={availabilityBySubjectId}
      disabled={disabled}
      showGlobalOverview={false}
      onSelectResource={(subjectId, resourceId) =>
        subjectId === "home" ? onSelectHome(resourceId) : onSelectAway(resourceId)
      }
      onDeselectResource={(subjectId, resourceId) => {
        if (subjectId === "home" && onDeselectHome) return onDeselectHome(resourceId);
        if (subjectId === "away" && onDeselectAway) return onDeselectAway(resourceId);
      }}
      testId={testId}
    />
  );
}

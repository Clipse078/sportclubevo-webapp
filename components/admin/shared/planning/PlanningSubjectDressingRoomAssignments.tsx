"use client";

/**
 * PLANNING-UX-07R4 — multi-subject dressing-room assignment rows + one picker per subject.
 */

import { useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { FacilityGroup, ResourceAvailabilityAnnotation } from "@/components/admin/training/FacilityResourceSelector";
import { buildTournamentParticipantDressingRoomAvailabilityByParticipant } from "@/lib/planning/resource-occupancy-presentation";
import { PlanningResourceAssignment } from "@/components/admin/shared/planning/PlanningResourceAssignment";
import { PlanningResourceAssignmentList } from "@/components/admin/shared/planning/PlanningResourceAssignmentList";
import { PlanningResourcePicker } from "@/components/admin/shared/planning/PlanningResourcePicker";
import { PlanningResourceGlobalOccupancyOverview } from "@/components/admin/shared/planning/PlanningResourceGlobalOccupancyOverview";

export type PlanningDressingRoomSubject = {
  id: string;
  displayName: string;
  secondaryLabel?: string | null;
  crest?: ReactNode;
  dressingRoomAllocations: Array<{
    facilityResourceId: string;
    facilityResourceName?: string;
  }>;
};

export type PlanningSubjectDressingRoomAssignmentsProps = {
  subjects: PlanningDressingRoomSubject[];
  canManage: boolean;
  facilityGroups: FacilityGroup[];
  dressingRoomAvailability?: Map<string, ResourceAvailabilityAnnotation>;
  /** When set, skips tournament participant merge (match side merge supplied externally). */
  availabilityBySubjectId?: Map<string, Map<string, ResourceAvailabilityAnnotation>>;
  disabled?: boolean;
  showGlobalOverview?: boolean;
  onSelectResource: (subjectId: string, resourceId: string) => void | Promise<void>;
  onDeselectResource?: (subjectId: string, resourceId: string) => void | Promise<void>;
  testId?: string;
};

function primaryAllocation(subject: PlanningDressingRoomSubject): string | null {
  const first = subject.dressingRoomAllocations[0];
  if (!first) return null;
  return first.facilityResourceName ?? first.facilityResourceId;
}

export function PlanningSubjectDressingRoomAssignments({
  subjects,
  canManage,
  facilityGroups,
  dressingRoomAvailability,
  availabilityBySubjectId,
  disabled = false,
  showGlobalOverview = false,
  onSelectResource,
  onDeselectResource,
  testId = "planning-dressing-room-assignments",
}: PlanningSubjectDressingRoomAssignmentsProps) {
  const t = useTranslations("PlanningResources");
  const [openSubjectId, setOpenSubjectId] = useState<string | null>(null);

  const tournamentMergedBySubject = useMemo(() => {
    if (availabilityBySubjectId) return availabilityBySubjectId;
    return buildTournamentParticipantDressingRoomAvailabilityByParticipant(
      dressingRoomAvailability,
      subjects.map((s) => ({
        id: s.id,
        displayName: s.displayName,
        dressingRoomAllocations: s.dressingRoomAllocations.map((a) => ({
          facilityResourceId: a.facilityResourceId,
        })),
      })),
    );
  }, [availabilityBySubjectId, dressingRoomAvailability, subjects]);

  const selectedByResourceId = useMemo(() => {
    const map = new Map<string, string>();
    for (const subject of subjects) {
      for (const a of subject.dressingRoomAllocations) {
        map.set(a.facilityResourceId, subject.displayName);
      }
    }
    return map;
  }, [subjects]);

  if (subjects.length === 0) {
    return (
      <p className="text-sm text-[var(--text-2)]" data-testid={`${testId}-empty`}>
        {t("unassignedDressingRoom")}
      </p>
    );
  }

  return (
    <div className="space-y-2" data-testid={testId}>
      <PlanningResourceAssignmentList testId={`${testId}-list`}>
        {subjects.map((subject) => {
          const assigned = primaryAllocation(subject);
          const isOpen = openSubjectId === subject.id;
          const selectedIds = new Set(subject.dressingRoomAllocations.map((a) => a.facilityResourceId));
          const pickerTitle = t("pickerTitleDressingRoom", { subject: subject.displayName });

          return (
            <PlanningResourceAssignment
              key={subject.id}
              testId={`${testId}-subject-${subject.id}`}
              subjectLeading={subject.crest}
              subjectLabel={subject.displayName}
              subjectSecondary={subject.secondaryLabel}
              resourceLabel={assigned}
              unassignedLabel={t("unassignedDressingRoom")}
              actionLabel={assigned ? t("change") : t("assign")}
              actionAriaLabel={
                assigned
                  ? t("changeDressingRoomFor", { subject: subject.displayName })
                  : t("assignDressingRoomFor", { subject: subject.displayName })
              }
              disabled={!canManage || disabled}
              onAction={() => setOpenSubjectId(isOpen ? null : subject.id)}
              picker={
                isOpen && canManage ? (
                  <PlanningResourcePicker
                    kind="dressing_room"
                    title={pickerTitle}
                    facilityGroups={facilityGroups}
                    selectedResourceIds={selectedIds}
                    onSelect={async (resourceId) => {
                      await onSelectResource(subject.id, resourceId);
                      setOpenSubjectId(null);
                    }}
                    onDeselect={async (resourceId) => {
                      if (onDeselectResource) {
                        await onDeselectResource(subject.id, resourceId);
                      }
                      setOpenSubjectId(null);
                    }}
                    availabilityByResourceId={tournamentMergedBySubject.get(subject.id)}
                    singleSelect
                    disabled={disabled}
                    testId={`${testId}-picker-${subject.id}`}
                    onCancel={() => setOpenSubjectId(null)}
                    cancelLabel={t("pickerCancel")}
                  />
                ) : null
              }
            />
          );
        })}
      </PlanningResourceAssignmentList>

      {showGlobalOverview ? (
        <PlanningResourceGlobalOccupancyOverview
          heading={t("globalOccupancyHeading")}
          facilityGroups={facilityGroups}
          availabilityByResourceId={dressingRoomAvailability}
          selectedByResourceId={selectedByResourceId}
          testId={`${testId}-global-occupancy`}
        />
      ) : null}

      {!canManage ? (
        <p className="sr-only">{t("unassignedDressingRoom")}</p>
      ) : null}
    </div>
  );
}

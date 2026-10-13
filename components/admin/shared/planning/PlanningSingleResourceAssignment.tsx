"use client";

/**
 * PLANNING-UX-07R4 — one subject / one resource type (pitch/hall or dressing room).
 */

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { FacilityGroup, ResourceAvailabilityAnnotation } from "@/components/admin/training/FacilityResourceSelector";
import {
  PlanningResourceAssignment,
} from "@/components/admin/shared/planning/PlanningResourceAssignment";
import {
  PlanningResourcePicker,
  type PlanningResourcePickerProps,
} from "@/components/admin/shared/planning/PlanningResourcePicker";
import { PlanningResourceAssignmentKindIcon } from "@/components/admin/shared/planning/FacilityResourceIdentity";

export type PlanningSingleResourceAssignmentProps = {
  kind: PlanningResourcePickerProps["kind"];
  subjectLabel: string;
  /** Hide duplicate resource-type label when a section heading already names the type. */
  showSubjectLabel?: boolean;
  subjectSecondary?: string | null;
  subjectLeading?: ReactNode;
  resourceName?: string | null;
  unassignedLabel: string;
  facilityGroups: FacilityGroup[];
  selectedResourceIds: Set<string>;
  onSelect: (resourceId: string) => void | Promise<void>;
  onDeselect?: (resourceId: string) => void | Promise<void>;
  availabilityByResourceId?: Map<string, ResourceAvailabilityAnnotation>;
  canManage: boolean;
  disabled?: boolean;
  /** When true, omit the default kind icon (e.g. section heading already shows it). */
  suppressKindIcon?: boolean;
  testId?: string;
};

export function PlanningSingleResourceAssignment({
  kind,
  subjectLabel,
  showSubjectLabel = true,
  subjectSecondary,
  subjectLeading,
  resourceName,
  unassignedLabel,
  facilityGroups,
  selectedResourceIds,
  onSelect,
  onDeselect,
  availabilityByResourceId,
  canManage,
  disabled = false,
  suppressKindIcon = false,
  testId = "planning-single-resource-assignment",
}: PlanningSingleResourceAssignmentProps) {
  const t = useTranslations("PlanningResources");
  const [open, setOpen] = useState(false);
  const assigned = Boolean(resourceName?.trim());
  const resolvedSubjectLeading =
    subjectLeading ??
    (suppressKindIcon || kind === "other" ? undefined : (
      <PlanningResourceAssignmentKindIcon
        kind={kind as "pitch_hall" | "dressing_room"}
        testId={`${testId}-kind-icon`}
      />
    ));
  const pickerTitle =
    kind === "dressing_room"
      ? t("pickerTitleDressingRoom", { subject: subjectLabel })
      : t("pickerTitlePitchHall", { subject: subjectLabel });

  if (!canManage) {
    return (
      <p className="text-sm text-[var(--text-2)]" data-testid={testId}>
        {assigned ? resourceName : unassignedLabel}
      </p>
    );
  }

  return (
    <PlanningResourceAssignment
      testId={testId}
      subjectLeading={resolvedSubjectLeading}
      subjectLabel={subjectLabel}
      showSubjectLabel={showSubjectLabel}
      subjectSecondary={subjectSecondary}
      resourceLabel={resourceName ?? null}
      unassignedLabel={unassignedLabel}
      actionLabel={assigned ? t("change") : t("assign")}
      actionAriaLabel={
        assigned
          ? kind === "dressing_room"
            ? t("changeDressingRoomFor", { subject: subjectLabel })
            : t("changePitchHallFor", { subject: subjectLabel })
          : kind === "dressing_room"
            ? t("assignDressingRoomFor", { subject: subjectLabel })
            : t("assignPitchHallFor", { subject: subjectLabel })
      }
      disabled={disabled}
      onAction={() => setOpen((v) => !v)}
      picker={
        open ? (
          <PlanningResourcePicker
            kind={kind}
            title={pickerTitle}
            facilityGroups={facilityGroups}
            selectedResourceIds={selectedResourceIds}
            onSelect={async (id) => {
              await onSelect(id);
              setOpen(false);
            }}
            onDeselect={
              onDeselect
                ? async (id) => {
                    await onDeselect(id);
                    setOpen(false);
                  }
                : undefined
            }
            availabilityByResourceId={availabilityByResourceId}
            singleSelect
            disabled={disabled}
            testId={`${testId}-picker`}
            onCancel={() => setOpen(false)}
            cancelLabel={t("pickerCancel")}
          />
        ) : null
      }
    />
  );
}

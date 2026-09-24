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

export type PlanningSingleResourceAssignmentProps = {
  kind: PlanningResourcePickerProps["kind"];
  subjectLabel: string;
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
  testId?: string;
};

export function PlanningSingleResourceAssignment({
  kind,
  subjectLabel,
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
  testId = "planning-single-resource-assignment",
}: PlanningSingleResourceAssignmentProps) {
  const t = useTranslations("PlanningResources");
  const [open, setOpen] = useState(false);
  const assigned = Boolean(resourceName?.trim());
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
      subjectLeading={subjectLeading}
      subjectLabel={subjectLabel}
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

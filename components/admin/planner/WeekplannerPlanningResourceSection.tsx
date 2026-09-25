"use client";

/**
 * PLANNING-UX-07R8 — Wochenplaner canonical resource assignment block
 * (current row + Zuweisen/Ändern + PlanningResourcePicker on demand).
 */

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { FacilityResourceType } from "@prisma/client";
import { PlanningResourceSemanticIconTile } from "@/components/admin/shared/planning/FacilityResourceIdentity";
import { PlanningResourceAssignment } from "@/components/admin/shared/planning/PlanningResourceAssignment";
import { PlanningResourcePicker } from "@/components/admin/shared/planning/PlanningResourcePicker";
import type {
  FacilityGroup,
  ResourceAvailabilityAnnotation,
} from "@/components/admin/training/FacilityResourceSelector";
import { recommendFreeFacilityResourceIds } from "@/lib/planning/recommend-free-facility-resources";

export type WeekplannerPlanningResourceSectionProps = {
  kind: "pitch_hall" | "dressing_room";
  facilityGroups: FacilityGroup[];
  selectedResourceIds: Set<string>;
  onSelect: (resourceId: string) => void;
  onDeselect: (resourceId: string) => void;
  availabilityByResourceId?: Map<string, ResourceAvailabilityAnnotation>;
  singleSelect?: boolean;
  disabled?: boolean;
  testId: string;
  unassignedLabel: string;
  /** Optional row label (e.g. Heimkabine) — hidden when section heading already names the type. */
  subjectLabel?: string;
  showSubjectLabel?: boolean;
  maxRecommended?: number;
};

function resolveResourceMeta(
  facilityGroups: FacilityGroup[],
  resourceId: string,
): { name: string; resourceType: FacilityResourceType; facilityType?: string } | null {
  for (const fg of facilityGroups) {
    const resource = fg.resources.find((r) => r.id === resourceId);
    if (resource) {
      return {
        name: resource.name,
        resourceType: resource.type,
        facilityType: resource.facilityType ?? fg.facilityType,
      };
    }
  }
  return null;
}

function formatAssignedLabel(facilityGroups: FacilityGroup[], selectedResourceIds: Set<string>): string | null {
  const names = Array.from(selectedResourceIds)
    .map((id) => resolveResourceMeta(facilityGroups, id)?.name)
    .filter(Boolean) as string[];
  if (names.length === 0) return null;
  return names.join(", ");
}

function primaryResourceMeta(facilityGroups: FacilityGroup[], selectedResourceIds: Set<string>) {
  const firstId = Array.from(selectedResourceIds)[0];
  if (!firstId) return null;
  return resolveResourceMeta(facilityGroups, firstId);
}

export function WeekplannerPlanningResourceSection({
  kind,
  facilityGroups,
  selectedResourceIds,
  onSelect,
  onDeselect,
  availabilityByResourceId,
  singleSelect = false,
  disabled = false,
  testId,
  unassignedLabel,
  subjectLabel = "",
  showSubjectLabel = false,
  maxRecommended = 3,
}: WeekplannerPlanningResourceSectionProps) {
  const t = useTranslations("PlanningResources");
  const [pickerOpen, setPickerOpen] = useState(false);

  const assignedLabel = formatAssignedLabel(facilityGroups, selectedResourceIds);
  const assigned = Boolean(assignedLabel?.trim());
  const primaryMeta = primaryResourceMeta(facilityGroups, selectedResourceIds);

  const recommendedResourceIds = useMemo(() => {
    if (!availabilityByResourceId?.size) return undefined;
    return new Set(
      recommendFreeFacilityResourceIds(facilityGroups, availabilityByResourceId, maxRecommended),
    );
  }, [availabilityByResourceId, facilityGroups, maxRecommended]);

  const pickerTitle =
    kind === "dressing_room"
      ? t("pickerTitleDressingRoom", { subject: subjectLabel || "Aktivität" })
      : t("pickerTitlePitchHall", { subject: subjectLabel || "Aktivität" });

  const picker = pickerOpen ? (
    <PlanningResourcePicker
      kind={kind}
      title={pickerTitle}
      facilityGroups={facilityGroups}
      selectedResourceIds={selectedResourceIds}
      onSelect={(id) => {
        onSelect(id);
        if (singleSelect) setPickerOpen(false);
      }}
      onDeselect={onDeselect}
      availabilityByResourceId={availabilityByResourceId}
      recommendedResourceIds={recommendedResourceIds}
      singleSelect={singleSelect}
      disabled={disabled}
      testId={`${testId}-picker`}
      onCancel={() => setPickerOpen(false)}
      cancelLabel={t("pickerCancel")}
    />
  ) : null;

  if (!singleSelect && selectedResourceIds.size > 1) {
    return (
      <div className="space-y-2" data-testid={testId}>
        <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
          {Array.from(selectedResourceIds).map((id) => {
            const meta = resolveResourceMeta(facilityGroups, id);
            if (!meta) return null;
            return (
              <li key={id} className="flex items-center gap-2.5 px-3 py-2.5">
                <PlanningResourceSemanticIconTile
                  resourceType={meta.resourceType}
                  facilityType={meta.facilityType}
                  testId={`${testId}-icon-${id}`}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--foreground)]">
                  {meta.name}
                </span>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          disabled={disabled}
          className="text-xs font-semibold text-[var(--sce-primary)] hover:underline disabled:opacity-50"
          data-testid={`${testId}-multi-action`}
        >
          {t("change")}
        </button>
        {picker}
      </div>
    );
  }

  return (
    <PlanningResourceAssignment
      testId={testId}
      showSubjectLabel={showSubjectLabel}
      subjectLabel={subjectLabel}
      subjectLeading={
        primaryMeta ? (
          <PlanningResourceSemanticIconTile
            resourceType={primaryMeta.resourceType}
            facilityType={primaryMeta.facilityType}
            testId={`${testId}-semantic-icon`}
          />
        ) : undefined
      }
      resourceLabel={assignedLabel}
      unassignedLabel={unassignedLabel}
      actionLabel={assigned ? t("change") : t("assign")}
      actionAriaLabel={assigned ? t("change") : t("assign")}
      onAction={() => setPickerOpen((v) => !v)}
      disabled={disabled}
      picker={picker}
    />
  );
}

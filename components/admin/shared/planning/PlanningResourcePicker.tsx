"use client";

/**
 * PLANNING-UX-07R4 — canonical operational resource picker (single inventory).
 * Uses UX-07R3 occupancy presentation via CompactOperationalResourceSelector.
 */

import {
  CompactOperationalResourceSelector,
  type CompactOperationalResourceKind,
} from "@/components/admin/shared/planning/CompactOperationalResourceSelector";
import type {
  FacilityGroup,
  ResourceAvailabilityAnnotation,
} from "@/components/admin/training/FacilityResourceSelector";

export type PlanningResourcePickerProps = {
  kind: CompactOperationalResourceKind;
  title: string;
  facilityGroups: FacilityGroup[];
  selectedResourceIds: Set<string>;
  onSelect: (resourceId: string) => void;
  onDeselect?: (resourceId: string) => void;
  availabilityByResourceId?: Map<string, ResourceAvailabilityAnnotation>;
  singleSelect?: boolean;
  disabled?: boolean;
  testId?: string;
  onCancel?: () => void;
  cancelLabel?: string;
  /** Presentation metadata — sort first and show compact Empfohlen badge (single inventory). */
  recommendedResourceIds?: Set<string>;
};

export function PlanningResourcePicker({
  kind,
  title,
  facilityGroups,
  selectedResourceIds,
  onSelect,
  onDeselect,
  availabilityByResourceId,
  singleSelect = true,
  disabled = false,
  testId,
  onCancel,
  cancelLabel = "Abbrechen",
  recommendedResourceIds,
}: PlanningResourcePickerProps) {
  return (
    <div
      className="mt-2 space-y-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 p-3"
      data-testid={testId ? `${testId}-panel` : undefined}
      role="region"
      aria-label={title}
    >
      <p className="text-sm font-medium text-[var(--foreground)]">{title}</p>
      <CompactOperationalResourceSelector
        kind={kind}
        facilityGroups={facilityGroups}
        selectedResourceIds={selectedResourceIds}
        onSelect={onSelect}
        onDeselect={onDeselect ?? (() => {})}
        availabilityByResourceId={availabilityByResourceId}
        singleSelect={singleSelect}
        disabled={disabled}
        layout="default"
        testId={testId}
        recommendedResourceIds={recommendedResourceIds}
      />
      {onCancel ? (
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium text-[var(--text-2)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
          data-testid={testId ? `${testId}-cancel` : undefined}
        >
          {cancelLabel}
        </button>
      ) : null}
    </div>
  );
}

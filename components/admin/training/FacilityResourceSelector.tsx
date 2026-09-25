"use client";

import { FacilityResourceSearchableSelector } from "@/components/admin/shared/FacilityResourceSearchableSelector";
import type { FacilityResourceType } from "@prisma/client";
import { formatResourceOccupancyPrimaryLine } from "@/lib/planning/resource-occupancy-presentation";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ResourceOption = {
  id: string;
  name: string;
  code: string;
  type: FacilityResourceType;
  facilityId: string;
  facilityName: string;
  /**
   * PLANNING-RESOURCE-UX-01-C2 — optional facility-level type (e.g. "PITCH",
   * "INDOOR_HALL") for MVP visual differentiation in PitchVisual. Allows
   * rendering a neutral hall visual for FULL_PITCH/HALF_PITCH resources that
   * belong to an indoor hall facility, without a schema change.
   */
  facilityType?: string;
};

export type FacilityGroup = {
  facilityId: string;
  facilityName: string;
  /**
   * PLANNING-RESOURCE-UX-01-C2 — optional facility-level type for visual
   * grouping and correct icon rendering in visual pickers.
   */
  facilityType?: string;
  resources: ResourceOption[];
};

/**
 * PLANNING-CREATION-UX-01A — optional live availability annotation for a
 * single FacilityResource, sourced from lib/facilities/availability-service.ts.
 * Purely additive: when a caller doesn't pass `availabilityByResourceId`,
 * the selector renders exactly as before.
 */
export type ResourceAvailabilityConflict = {
  label: string;
  startAt: string;
  endAt: string;
};

export type ResourceAvailabilityAnnotation = {
  status: "FREE" | "OCCUPIED";
  conflictLabel?: string | null;
  conflictStartAt?: string | null;
  conflictEndAt?: string | null;
  /** Additional overlapping occupants when more than one booking conflicts. */
  conflicts?: ResourceAvailabilityConflict[];
  /** PLANNING-UX-07R3 — presentation-only occupancy classification for cards/selects. */
  occupancyPresentation?: "FREE" | "OCCUPIED" | "SHARED" | "CURRENT";
  /** Other subjects sharing this resource (viewer excluded). */
  sharingSubjectLabels?: string[];
};

type Props = {
  /** Non-archived resources for this allocation group, grouped by facility. */
  facilityGroups: FacilityGroup[];
  /** IDs of resources already allocated (will be shown as disabled). */
  allocatedResourceIds: Set<string>;
  /** Called when the user selects a resource to add. */
  onAdd: (resourceId: string) => Promise<void>;
  disabled?: boolean;
  /** Placeholder shown as the first, unselectable `<option>`. */
  placeholder?: string;
  /** Label for the submit button. */
  addButtonLabel?: string;
  /** Shown instead of the selector when the tenant has zero resources of this group's type. */
  noResourcesMessage?: string;
  /** Shown instead of the selector when resources exist but are all already allocated. */
  allAllocatedMessage?: string;
  /** Stable identifier suffix for data-testid hooks (e.g. "pitch-hall", "dressing-room"). */
  testId?: string;
  /**
   * PLANNING-CREATION-UX-01A — live Frei/Belegt availability per resource id
   * for the currently selected date/time. When provided, occupied resources
   * remain selectable (visible, never hidden) but are annotated inline, e.g.
   * "Kunstrasen 3 A — Belegt · Training E2 · 17:00–18:00".
   */
  availabilityByResourceId?: Map<string, ResourceAvailabilityAnnotation>;
};

function formatClockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" });
}

/**
 * RESOURCE-AVAILABILITY-UX-01 — exported so native <select> surfaces that
 * cannot use this component directly (e.g. MatchcenterDetailOperational's
 * legacy code-based selects) still render the exact same Frei/Belegt
 * wording, instead of inventing a second phrasing.
 */
export function formatAvailabilitySuffix(
  annotation: ResourceAvailabilityAnnotation | undefined,
  context?: { isSelected?: boolean },
): string {
  const line = formatResourceOccupancyPrimaryLine(annotation, context);
  if (!line) return "";
  const timeRange =
    annotation?.status === "OCCUPIED" && annotation.conflictStartAt && annotation.conflictEndAt
      ? ` · ${formatClockTime(annotation.conflictStartAt)}–${formatClockTime(annotation.conflictEndAt)}`
      : "";
  return ` — ${line}${timeRange}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FacilityResourceSelector(props: Props) {
  return <FacilityResourceSearchableSelector {...props} />;
}

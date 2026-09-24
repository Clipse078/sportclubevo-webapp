"use client";

/**
 * PLANNING-UX-07R4 — optional compact global occupancy (rendered once per section).
 */

import { useMemo } from "react";
import type { FacilityGroup, ResourceAvailabilityAnnotation } from "@/components/admin/training/FacilityResourceSelector";
import { formatResourceOccupancyPrimaryLine } from "@/lib/planning/resource-occupancy-presentation";

function flattenResourceNames(facilityGroups: FacilityGroup[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const fg of facilityGroups) {
    for (const r of fg.resources) {
      map.set(r.id, r.name);
    }
  }
  return map;
}

export type PlanningResourceGlobalOccupancyOverviewProps = {
  heading: string;
  facilityGroups: FacilityGroup[];
  availabilityByResourceId?: Map<string, ResourceAvailabilityAnnotation>;
  selectedByResourceId?: Map<string, string>;
  testId?: string;
};

export function PlanningResourceGlobalOccupancyOverview({
  heading,
  facilityGroups,
  availabilityByResourceId,
  selectedByResourceId,
  testId = "planning-resource-global-occupancy",
}: PlanningResourceGlobalOccupancyOverviewProps) {
  const names = useMemo(() => flattenResourceNames(facilityGroups), [facilityGroups]);

  const rows = useMemo(() => {
    const ids = new Set<string>([...names.keys(), ...(availabilityByResourceId?.keys() ?? [])]);
    return [...ids]
      .map((id) => ({
        id,
        name: names.get(id) ?? id,
        line: formatResourceOccupancyPrimaryLine(availabilityByResourceId?.get(id), {
          isSelected: selectedByResourceId?.has(id),
        }),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "de"));
  }, [availabilityByResourceId, names, selectedByResourceId]);

  if (rows.length === 0) return null;

  return (
    <div className="mt-3 text-xs text-[var(--text-2)]" data-testid={testId}>
      <p className="mb-1.5 font-semibold uppercase tracking-wide text-[var(--muted)]">{heading}</p>
      <ul className="grid gap-0.5 sm:grid-cols-2">
        {rows.map((row) => (
          <li key={row.id} className="flex min-w-0 gap-2">
            <span className="shrink-0 font-medium text-[var(--foreground)]">{row.name}</span>
            <span className="min-w-0 truncate">{row.line ?? "Frei"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

"use client";

import { CalendarActivityMarkers } from "./CalendarActivityMarkers";
import type { PersonalProgrammeSourceType } from "@/lib/personal-agenda/personal-programme-types";

export type PersonalProgrammeActivityIndicatorProps = {
  count: number;
  /** @deprecated Chips removed from month cells — markers only (SCE-CALENDAR-UX-02). */
  previewLabel?: string;
  primarySourceType?: PersonalProgrammeSourceType;
  markerSourceTypes?: readonly PersonalProgrammeSourceType[];
  overflowCount?: number;
  /** @deprecated Selection styling lives on the day cell. */
  isSelected?: boolean;
  tooltipSummary?: string;
};

export function PersonalProgrammeActivityIndicator({
  count,
  markerSourceTypes = [],
  overflowCount = 0,
  primarySourceType,
  tooltipSummary,
}: PersonalProgrammeActivityIndicatorProps) {
  if (count <= 0) return null;

  const markerSlots =
    markerSourceTypes.length > 0
      ? markerSourceTypes
      : primarySourceType
        ? [primarySourceType]
        : [];

  return (
    <CalendarActivityMarkers
      markerSlots={markerSlots}
      overflowCount={overflowCount}
      tooltipSummary={tooltipSummary}
    />
  );
}

"use client";

import { cn } from "@/lib/cn";
import { getProgrammeSourcePresentation } from "@/lib/personal-agenda/programme-source-presentation";
import type { PersonalProgrammeSourceType } from "@/lib/personal-agenda/personal-programme-types";

export type CalendarActivityMarkersProps = {
  markerSlots: readonly PersonalProgrammeSourceType[];
  overflowCount?: number;
  className?: string;
  dotClassName?: string;
  /** When set, exposed as title for hover/focus tooltips (visual supplement to cell aria-label). */
  tooltipSummary?: string;
};

export function CalendarActivityMarkerDot({
  sourceType,
  className,
}: {
  sourceType: PersonalProgrammeSourceType;
  className?: string;
}) {
  const presentation = getProgrammeSourcePresentation(sourceType);
  return (
    <span
      className={cn("inline-block h-1.5 w-1.5 shrink-0 rounded-full", presentation.markerAccentClass, className)}
      data-programme-palette={presentation.paletteKey}
      data-programme-source={sourceType}
      aria-hidden="true"
    />
  );
}

/**
 * Compact semantic activity markers for month grid cells (calm dots + optional +N).
 */
export function CalendarActivityMarkers({
  markerSlots,
  overflowCount = 0,
  className,
  dotClassName,
  tooltipSummary,
}: CalendarActivityMarkersProps) {
  if (markerSlots.length === 0 && overflowCount <= 0) {
    return null;
  }

  return (
    <span
      className={cn("mt-auto flex flex-col items-center gap-px", className)}
      aria-hidden="true"
      title={tooltipSummary}
    >
      <span className="flex max-w-full flex-wrap items-center justify-center gap-0.5">
        {markerSlots.map((sourceType, index) => (
          <CalendarActivityMarkerDot key={`${sourceType}-${index}`} sourceType={sourceType} className={dotClassName} />
        ))}
      </span>
      {overflowCount > 0 ? (
        <span className="text-[0.5rem] font-bold tabular-nums text-[var(--muted)]">+{overflowCount}</span>
      ) : null}
    </span>
  );
}

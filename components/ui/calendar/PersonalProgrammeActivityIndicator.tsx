"use client";

import { cn } from "@/lib/cn";
import { getProgrammeSourcePresentation } from "@/lib/personal-agenda/programme-source-presentation";
import type { PersonalProgrammeSourceType } from "@/lib/personal-agenda/personal-programme-types";

export type PersonalProgrammeActivityIndicatorProps = {
  count: number;
  previewLabel?: string;
  primarySourceType?: PersonalProgrammeSourceType;
  markerSourceTypes?: readonly PersonalProgrammeSourceType[];
  overflowCount?: number;
  isSelected?: boolean;
};

export function PersonalProgrammeActivityIndicator({
  count,
  previewLabel,
  primarySourceType,
  markerSourceTypes = [],
  overflowCount = 0,
  isSelected = false,
}: PersonalProgrammeActivityIndicatorProps) {
  if (count <= 0) return null;

  if (previewLabel && count === 1 && primarySourceType) {
    const presentation = getProgrammeSourcePresentation(primarySourceType);
    return (
      <span
        className={cn(
          "mt-auto max-w-full truncate rounded border px-0.5 py-px text-[0.5625rem] font-semibold leading-none",
          presentation.chipTintClass,
          presentation.chipBorderClass,
          presentation.chipTextClass,
          isSelected && "shadow-sm ring-1 ring-[color-mix(in_srgb,var(--primary)_35%,transparent)]",
        )}
        data-programme-palette={presentation.paletteKey}
        data-programme-source={primarySourceType}
        aria-hidden="true"
      >
        {previewLabel}
      </span>
    );
  }

  const markers =
    markerSourceTypes.length > 0
      ? markerSourceTypes
      : primarySourceType
        ? [primarySourceType]
        : [];

  return (
    <span className="mt-auto flex flex-col items-center gap-px" aria-hidden="true">
      <span className="flex max-w-full items-center justify-center gap-0.5">
        {markers.map((sourceType) => {
          const presentation = getProgrammeSourcePresentation(sourceType);
          return (
            <span
              key={sourceType}
              className={cn("h-0.5 w-3 shrink-0 rounded-full", presentation.markerAccentClass)}
              data-programme-palette={presentation.paletteKey}
              data-programme-source={sourceType}
            />
          );
        })}
      </span>
      {overflowCount > 0 ? (
        <span className="text-[0.5rem] font-bold tabular-nums text-[var(--muted)]">+{overflowCount}</span>
      ) : null}
    </span>
  );
}

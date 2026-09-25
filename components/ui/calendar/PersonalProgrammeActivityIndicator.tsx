"use client";

import { ActivitySceIcon } from "@/components/planning/ActivitySceIcon";
import { cn } from "@/lib/cn";
import { getProgrammeSourceActivitySceIconName } from "@/lib/planning/activity-sce-icon";
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

function CalendarActivityMarker({
  sourceType,
  compact = false,
}: {
  sourceType: PersonalProgrammeSourceType;
  compact?: boolean;
}) {
  const sceIcon = getProgrammeSourceActivitySceIconName(sourceType);
  if (sceIcon) {
    const presentation = getProgrammeSourcePresentation(sourceType);
    return (
      <span
        data-programme-palette={presentation.paletteKey}
        data-programme-source={sourceType}
        className="inline-flex shrink-0"
      >
        <ActivitySceIcon
          activityKind={sourceType}
          size={compact ? 12 : 13}
          className="shrink-0"
        />
      </span>
    );
  }

  const presentation = getProgrammeSourcePresentation(sourceType);
  return (
    <span
      className={cn("h-0.5 w-3 shrink-0 rounded-full", presentation.markerAccentClass)}
      data-programme-palette={presentation.paletteKey}
      data-programme-source={sourceType}
    />
  );
}

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
    const sceIcon = getProgrammeSourceActivitySceIconName(primarySourceType);

    if (sceIcon) {
      return (
        <span
          className={cn(
            "mt-auto flex max-w-full items-center gap-0.5 truncate rounded border px-0.5 py-px text-[0.5625rem] font-semibold leading-none",
            presentation.chipTintClass,
            presentation.chipBorderClass,
            presentation.chipTextClass,
            isSelected && "shadow-sm ring-1 ring-[color-mix(in_srgb,var(--primary)_35%,transparent)]",
          )}
          data-programme-palette={presentation.paletteKey}
          data-programme-source={primarySourceType}
          aria-hidden="true"
        >
          <span data-programme-palette={presentation.paletteKey} data-programme-source={primarySourceType}>
            <ActivitySceIcon activityKind={primarySourceType} size={12} />
          </span>
          <span className="truncate">{previewLabel}</span>
        </span>
      );
    }

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
        {markers.map((sourceType) => (
          <CalendarActivityMarker key={sourceType} sourceType={sourceType} compact />
        ))}
      </span>
      {overflowCount > 0 ? (
        <span className="text-[0.5rem] font-bold tabular-nums text-[var(--muted)]">+{overflowCount}</span>
      ) : null}
    </span>
  );
}

import type { CalendarItemSemanticType } from "./normalized-calendar-item-types";
import type { ProgrammeSourcePresentation } from "./programme-source-presentation";
import { getProgrammeSourcePresentation } from "./programme-source-presentation";

export type CalendarItemPresentation = Omit<ProgrammeSourcePresentation, "sourceType"> & {
  semanticType: CalendarItemSemanticType;
};

const TASK_PRESENTATION: CalendarItemPresentation = {
  semanticType: "TASK",
  paletteKey: "training-blue",
  markerAccentClass: "bg-[var(--muted)]",
  dayTintClass: "bg-[color-mix(in_srgb,var(--surface-2)_70%,transparent)]",
  chipTintClass: "bg-[color-mix(in_srgb,var(--surface-2)_85%,transparent)]",
  chipBorderClass: "border-[color-mix(in_srgb,var(--border)_80%,transparent)]",
  chipTextClass: "text-[var(--text-2)]",
};

/** Semantic surface styling for normalized calendar blocks (programme + tasks). */
export function getCalendarItemPresentation(
  semanticType: CalendarItemSemanticType,
): CalendarItemPresentation {
  if (semanticType === "TASK") {
    return TASK_PRESENTATION;
  }
  const { sourceType: _omit, ...programme } = getProgrammeSourcePresentation(semanticType);
  void _omit;
  return {
    semanticType,
    ...programme,
  };
}

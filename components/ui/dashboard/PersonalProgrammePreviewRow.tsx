"use client";

import type { PersonalProgrammeItem } from "@/lib/personal-agenda/personal-programme-types";
import { PersonalProgrammeAgendaRow } from "./PersonalProgrammeAgendaRow";
import { PersonalProgrammeCanonicalAgendaRow } from "./PersonalProgrammeCanonicalAgendaRow";
import { SCE_PROGRAMME_DASHBOARD_PREVIEW_LIST_ROW } from "@/lib/sporting-activity-presentation/canonical/programme-dashboard-preview-contract";

export type PersonalProgrammePreviewRowProps = {
  item: PersonalProgrammeItem;
  timeLabel: string;
  endTimeLabel?: string;
  /** Calendar day sync or nearest-upcoming emphasis (modest highlight only). */
  highlighted?: boolean;
  className?: string;
  /** Dashboard cockpit (/dashboard) stacked preview rows; Mein Programm list omits this flag. */
  dashboardCockpitPreview?: boolean;
};

/**
 * Dashboard Mein Programm preview row — canonical programme cards when available;
 * legacy compact agenda only for degraded rows without presentation.
 */
export function PersonalProgrammePreviewRow({
  item,
  timeLabel,
  endTimeLabel,
  highlighted = false,
  className,
  dashboardCockpitPreview = false,
}: PersonalProgrammePreviewRowProps) {
  if (!item.canonicalPresentation) {
    return (
      <PersonalProgrammeAgendaRow
        item={item}
        timeLabel={timeLabel}
        endTimeLabel={endTimeLabel}
        highlighted={highlighted}
        className={className}
      />
    );
  }

  return (
    <PersonalProgrammeCanonicalAgendaRow
      item={item}
      highlighted={highlighted}
      density="COMPACT"
      listRowPresentation={
        dashboardCockpitPreview ? SCE_PROGRAMME_DASHBOARD_PREVIEW_LIST_ROW : "programme-personal"
      }
      className={className}
    />
  );
}

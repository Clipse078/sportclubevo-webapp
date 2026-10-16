"use client";

import type { PersonalProgrammeItem } from "@/lib/personal-agenda/personal-programme-types";
import { PersonalProgrammeAgendaRow } from "./PersonalProgrammeAgendaRow";
import { PersonalProgrammeCanonicalAgendaRow } from "./PersonalProgrammeCanonicalAgendaRow";

export type PersonalProgrammePreviewRowProps = {
  item: PersonalProgrammeItem;
  timeLabel: string;
  endTimeLabel?: string;
  /** Calendar day sync or nearest-upcoming emphasis (modest highlight only). */
  highlighted?: boolean;
  className?: string;
};

/**
 * Dashboard Mein Programm preview row — canonical Sce* cards for sporting programme;
 * meetings and degraded rows keep the compact legacy agenda path.
 */
export function PersonalProgrammePreviewRow({
  item,
  timeLabel,
  endTimeLabel,
  highlighted = false,
  className,
}: PersonalProgrammePreviewRowProps) {
  if (item.sourceType === "MEETING" || !item.canonicalPresentation) {
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
      className={className}
    />
  );
}

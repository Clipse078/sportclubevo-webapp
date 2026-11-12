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
 * Dashboard Mein Programm preview row — canonical programme cards when available;
 * legacy compact agenda only for degraded rows without presentation.
 */
export function PersonalProgrammePreviewRow({
  item,
  timeLabel,
  endTimeLabel,
  highlighted = false,
  className,
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
      density="STANDARD"
      className={className}
    />
  );
}

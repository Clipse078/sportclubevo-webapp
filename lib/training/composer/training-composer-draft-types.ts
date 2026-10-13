import type { Weekday } from "@/lib/training/types";

export type TrainingComposerResourceSelection = {
  facilityResourceId: string;
  facilityResourceName: string;
  kind: "pitch_hall" | "dressing_room";
};

export type TrainingComposerWeekdaySchedule = {
  weekday: Weekday;
  startsAt: string;
  endsAt: string;
};

export type TrainingComposerPublicationValues = {
  /** Reserved — team-season publication inherits at runtime; toggles for future channel parity. */
  noteOnly: boolean;
};

export type TrainingComposerDraftPayload = {
  teamSeasonId: string;
  title: string;
  description: string;
  timezone: string;
  validFrom: string;
  validUntil: string;
  recurrenceEnabled: boolean;
  weekdaySchedules: TrainingComposerWeekdaySchedule[];
  resources: TrainingComposerResourceSelection[];
  publication: TrainingComposerPublicationValues;
};

export function createEmptyTrainingComposerDraft(timezone = "Europe/Zurich"): TrainingComposerDraftPayload {
  return {
    teamSeasonId: "",
    title: "",
    description: "",
    timezone,
    validFrom: "",
    validUntil: "",
    recurrenceEnabled: false,
    weekdaySchedules: [],
    resources: [],
    publication: { noteOnly: true },
  };
}

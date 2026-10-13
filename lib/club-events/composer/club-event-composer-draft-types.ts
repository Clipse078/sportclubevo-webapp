import type { ClubEventOrganisationalAudienceEditorValue } from "@/components/admin/veranstaltungen/ClubEventOrganisationalAudienceEditor";
import type { VeranstaltungAusspielungValues } from "@/components/admin/veranstaltungen/VeranstaltungAusspielungFields";
import type { VeranstaltungScheduleFieldValues } from "@/components/admin/veranstaltungen/VeranstaltungScheduleFields";
import type { VeranstaltungRecurrenceFieldValues } from "@/components/admin/veranstaltungen/VeranstaltungRecurrenceFields";

export type ClubEventComposerResourceSelection = {
  facilityResourceId: string;
  facilityResourceName: string;
  kind: "pitch_hall" | "dressing_room" | "other";
};

export type ClubEventComposerDraftPayload = {
  seasonId: string;
  title: string;
  category: string;
  description: string;
  location: string;
  organizerName: string;
  remarks: string;
  schedule: VeranstaltungScheduleFieldValues;
  audience: ClubEventOrganisationalAudienceEditorValue;
  ausspielung: VeranstaltungAusspielungValues;
  recurrence: VeranstaltungRecurrenceFieldValues;
  resources: ClubEventComposerResourceSelection[];
};

export function createEmptyClubEventComposerDraft(): ClubEventComposerDraftPayload {
  return {
    seasonId: "",
    title: "",
    category: "",
    description: "",
    location: "",
    organizerName: "",
    remarks: "",
    schedule: {
      allDay: false,
      startDate: "",
      endDate: "",
      startTime: "18:00",
      endTime: "20:00",
    },
    audience: { scope: "CLUB_WIDE", targets: [] },
    ausspielung: {
      websiteVisible: true,
      homepageVisible: false,
      wochenplanVisible: false,
    },
    recurrence: {
      enabled: false,
      frequency: "MONTHLY",
      intervalCount: 1,
      weekday: "MONDAY",
      monthlyPatternKind: "DAY_OF_MONTH",
      monthDay: 1,
      monthOrdinal: "FIRST",
      endMode: "ON_DATE",
      endDate: "",
      occurrenceCount: 12,
    },
    resources: [],
  };
}

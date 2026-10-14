import type { TournamentComposerDraftPayload } from "@/lib/tournaments/composer/tournament-composer-draft-types";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import type { ExternalClubPickerResult } from "@/components/admin/tournamentcenter/ExternalClubPicker";

export type TournamentCreateReviewSummary = {
  title: string;
  participantCount: number;
  ownTeamCount: number;
  externalClubCount: number;
  manualCount: number;
  scheduleLabel: string;
  endTimeLabel: string | null;
  multiDay: boolean;
  meetingTimeLabel: string | null;
  locationLabel: string | null;
  homeAwayLabel: string;
  resourceLabels: string[];
  dressingRoomByParticipant: Array<{ participantLabel: string; resourceLabel: string }>;
  publicationLabels: string[];
  organiserLabel: string | null;
};

function formatDateTimeDeCH(isoLocal: string): string | null {
  if (!isoLocal.trim()) return null;
  const d = new Date(isoLocal);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTimeDeCH(isoLocal: string): string | null {
  if (!isoLocal.trim()) return null;
  const d = new Date(isoLocal);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" });
}

function resolveResourceLabel(groups: FacilityGroup[], facilityResourceId: string): string {
  for (const group of groups) {
    const resource = group.resources.find((r) => r.id === facilityResourceId);
    if (resource) {
      return group.facilityName ? `${group.facilityName} · ${resource.name}` : resource.name;
    }
  }
  return facilityResourceId;
}

export function buildTournamentCreateReviewSummary(input: {
  payload: Pick<
    TournamentComposerDraftPayload,
    | "title"
    | "participants"
    | "startAt"
    | "endAt"
    | "meetingTime"
    | "location"
    | "homeAway"
    | "resourceAllocations"
    | "publication"
  >;
  organizer: ExternalClubPickerResult | null;
  pitchHallFacilityGroups: FacilityGroup[];
  dressingRoomFacilityGroups: FacilityGroup[];
}): TournamentCreateReviewSummary {
  const { payload, organizer, pitchHallFacilityGroups, dressingRoomFacilityGroups } = input;
  const participants = payload.participants;
  const startLabel = formatDateTimeDeCH(payload.startAt);
  const endDate = payload.endAt ? new Date(payload.endAt) : null;
  const startDate = payload.startAt ? new Date(payload.startAt) : null;
  const multiDay =
    startDate &&
    endDate &&
    !Number.isNaN(startDate.getTime()) &&
    !Number.isNaN(endDate.getTime()) &&
    startDate.toDateString() !== endDate.toDateString();

  const publicationLabels = [
    payload.publication.websiteVisible ? "Website" : null,
    payload.publication.infoboardVisible ? "Infoboard" : null,
    payload.publication.homepageVisible ? "Homepage" : null,
    payload.publication.wochenplanVisible ? "Wochenplan" : null,
    payload.publication.teamPageVisible ? "Teamseite" : null,
  ].filter((v): v is string => !!v);

  return {
    title: payload.title.trim() || "—",
    participantCount: participants.length,
    ownTeamCount: participants.filter((p) => p.kind === "TEAM").length,
    externalClubCount: participants.filter((p) => p.kind === "EXTERNAL_CLUB").length,
    manualCount: participants.filter((p) => p.kind === "MANUAL").length,
    scheduleLabel: startLabel ?? "—",
    endTimeLabel: payload.endAt ? formatTimeDeCH(payload.endAt) : null,
    multiDay: Boolean(multiDay),
    meetingTimeLabel: payload.meetingTime.trim() || null,
    locationLabel: payload.location.trim() || null,
    homeAwayLabel: payload.homeAway === "AWAY" ? "Auswärts" : "Heim",
    resourceLabels: payload.resourceAllocations.map((r) =>
      r.facilityResourceName
        ? `${r.facilityName ? `${r.facilityName} · ` : ""}${r.facilityResourceName}`
        : resolveResourceLabel(pitchHallFacilityGroups, r.facilityResourceId),
    ),
    dressingRoomByParticipant: participants
      .flatMap((p) =>
        p.dressingRooms.map((d) => ({
          participantLabel: p.displayName,
          resourceLabel: d.facilityResourceName
            ? `${d.facilityName ? `${d.facilityName} · ` : ""}${d.facilityResourceName}`
            : resolveResourceLabel(dressingRoomFacilityGroups, d.facilityResourceId),
        })),
      )
      .filter((row) => row.resourceLabel),
    publicationLabels,
    organiserLabel: organizer?.name?.trim() || null,
  };
}

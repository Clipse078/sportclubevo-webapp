import type { ClubEventComposerDraftPayload } from "./club-event-composer-draft-types";
import type { ClubEventOrganisationalAudienceDto } from "@/lib/events/club-event-organisational-audience-types";
import { createEmptyClubEventComposerDraft } from "./club-event-composer-draft-types";

export type ClubEventComposerFormFieldState = {
  seasonId: string;
  title: string;
  category: string;
  description: string;
  location: string;
  organizerName: string;
  remarks: string;
  schedule: ClubEventComposerDraftPayload["schedule"];
  audience: ClubEventComposerDraftPayload["audience"];
  ausspielung: ClubEventComposerDraftPayload["ausspielung"];
  recurrence: ClubEventComposerDraftPayload["recurrence"];
  pitchDraft: {
    localId: string;
    facilityResourceId: string;
    facilityResourceName: string;
  } | null;
  dressingDraft: {
    localId: string;
    facilityResourceId: string;
    facilityResourceName: string;
  } | null;
  otherDrafts: Array<{
    localId: string;
    facilityResourceId: string;
    facilityResourceName: string;
  }>;
};

export function clubEventAudienceToEditorInitial(
  audience: ClubEventComposerDraftPayload["audience"],
): ClubEventOrganisationalAudienceDto {
  return {
    scope: audience.scope,
    teamIds: audience.targets.filter((t) => t.kind === "TEAM").map((t) => t.id),
    orgUnitIds: audience.targets.filter((t) => t.kind === "ORG_UNIT").map((t) => t.id),
    targets: audience.targets,
  };
}

export function hydrateClubEventComposerFormFromDraft(
  payload: ClubEventComposerDraftPayload,
  nextLocalId: (prefix: string) => string,
): ClubEventComposerFormFieldState {
  const pitch = payload.resources.find((r) => r.kind === "pitch_hall");
  const dressing = payload.resources.find((r) => r.kind === "dressing_room");
  return {
    seasonId: payload.seasonId,
    title: payload.title,
    category: payload.category,
    description: payload.description,
    location: payload.location,
    organizerName: payload.organizerName,
    remarks: payload.remarks,
    schedule: payload.schedule,
    audience: payload.audience,
    ausspielung: payload.ausspielung,
    recurrence: payload.recurrence,
    pitchDraft: pitch
      ? {
          localId: nextLocalId("pitch"),
          facilityResourceId: pitch.facilityResourceId,
          facilityResourceName: pitch.facilityResourceName,
        }
      : null,
    dressingDraft: dressing
      ? {
          localId: nextLocalId("dressing"),
          facilityResourceId: dressing.facilityResourceId,
          facilityResourceName: dressing.facilityResourceName,
        }
      : null,
    otherDrafts: payload.resources
      .filter((r) => r.kind === "other")
      .map((r) => ({
        localId: nextLocalId("other"),
        facilityResourceId: r.facilityResourceId,
        facilityResourceName: r.facilityResourceName,
      })),
  };
}

export function emptyClubEventComposerFormFieldState(): ClubEventComposerFormFieldState {
  const empty = createEmptyClubEventComposerDraft();
  return {
    seasonId: empty.seasonId,
    title: empty.title,
    category: empty.category,
    description: empty.description,
    location: empty.location,
    organizerName: empty.organizerName,
    remarks: empty.remarks,
    schedule: empty.schedule,
    audience: empty.audience,
    ausspielung: empty.ausspielung,
    recurrence: empty.recurrence,
    pitchDraft: null,
    dressingDraft: null,
    otherDrafts: [],
  };
}

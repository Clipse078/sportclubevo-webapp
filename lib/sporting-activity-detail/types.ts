import type { ClubIdentity } from "@/lib/sporting-activity-design/club-identity";
import type { MatchClubIdentityPair } from "@/lib/sporting-activity-design/match-identity";
import type { SportingActivityPresentation } from "@/lib/sporting-activity-presentation/types";

export type SportingActivityDetailKind = "TRAINING" | "MATCH" | "TOURNAMENT";

/** Participant-facing participation block — never exposes admin/source fields. */
export type SportingActivityDetailParticipation = {
  personId: string;
  teamSeasonId: string;
  eventKind: SportingActivityDetailKind;
  trainingSessionId?: string;
  eventId?: string;
  status: "OPEN" | "YES" | "NO" | "MAYBE";
  /** When true, detail may offer inline response using canonical participation service. */
  canRespond: boolean;
  personalActionId?: string;
  allowedResponses?: readonly ("YES" | "NO" | "MAYBE")[];
};

export type SportingActivityDetailInformationItem = {
  label: string;
  value: string;
};

export type SportingActivityDetailRouteTarget = {
  label: string;
  href: string;
};

export type SportingActivityDetailMatchSection = {
  clubPair: MatchClubIdentityPair;
};

export type SportingActivityDetailTournamentSection = {
  organiserClubIdentity: ClubIdentity;
  tournamentInfo: SportingActivityDetailInformationItem[];
};

export type SportingActivityDetailTrainingSection = {
  trainers: { name: string; roleLabel?: string | null }[];
};

export type SportingActivityDetailParticipantTeam = {
  label: string;
  identity: ClubIdentity;
};

/**
 * Canonical read model for Activity Detail (SCE-ACTIVITY-DESIGN-01B).
 * Server-composed; safe for client rendering without domain leakage.
 */
export type SportingActivityDetail = {
  resourceKey: string;
  kind: SportingActivityDetailKind;
  presentation: SportingActivityPresentation;
  teamLabel?: string;
  participantTeam?: SportingActivityDetailParticipantTeam;
  meetingAt?: string | null;
  routeTarget?: SportingActivityDetailRouteTarget | null;
  participation?: SportingActivityDetailParticipation;
  participantInformation?: SportingActivityDetailInformationItem[];
  match?: SportingActivityDetailMatchSection;
  tournament?: SportingActivityDetailTournamentSection;
  training?: SportingActivityDetailTrainingSection;
};

export type LoadSportingActivityDetailResult =
  | { ok: true; detail: SportingActivityDetail }
  | { ok: false; reason: "not_found" | "forbidden" };

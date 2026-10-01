import type { EventType } from "@prisma/client";
import { resolvePitchPresentationLabel } from "@/lib/dashboard/event-venue-presentation";
import { resolveMatchParticipantIdentity } from "@/lib/sporting-data/match-participant-identity";
import type { CanonicalEventPolicyRow } from "@/lib/publishing/infoboard/canonical-source-loader";
import type { PersonalProgrammePresentationStatus } from "@/lib/personal-agenda/personal-programme-types";
import {
  buildSportingActivityLocation,
  normalizeSportingLocationMode,
} from "./location";
import { formatSportingActivityPresentation } from "./format";
import type {
  SportingActivityKind,
  SportingActivityPresentation,
} from "./types";

function meaningful(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export type BuildTrainingPresentationInput = {
  resourceKey: string;
  title: string;
  typeLabel: string;
  teamName?: string | null;
  startAt: Date;
  endAt?: Date | null;
  status?: PersonalProgrammePresentationStatus;
  facilityName?: string | null;
  pitchResourceName?: string | null;
  /** Tenant club / host context for compact secondary (not the SCE team). */
  clubContextName?: string | null;
};

export function buildTrainingActivityPresentation(
  input: BuildTrainingPresentationInput,
): SportingActivityPresentation {
  const location = buildSportingActivityLocation({
    mode: "HOME",
    hostOrOrganiser: meaningful(input.clubContextName),
    venueName: input.facilityName,
    facilityResource: input.pitchResourceName,
  });

  return {
    identity: {
      resourceKey: input.resourceKey,
      title: input.title,
      typeLabel: input.typeLabel,
      activityKind: "TRAINING",
    },
    schedule: {
      startAt: input.startAt.toISOString(),
      endAt: input.endAt ? input.endAt.toISOString() : null,
      allDay: false,
    },
    team: input.teamName?.trim() ? { name: input.teamName.trim() } : undefined,
    location,
    status: input.status,
  };
}

export type BuildMatchPresentationInput = {
  resourceKey: string;
  title: string;
  typeLabel: string;
  teamName?: string | null;
  opponentName?: string | null;
  homeAway?: string | null;
  location?: string | null;
  pitchCode?: string | null;
  pitchLabel?: string | null;
  competitionLabel?: string | null;
  startAt: Date;
  endAt?: Date | null;
  allDay?: boolean;
  status?: PersonalProgrammePresentationStatus;
  policy?: CanonicalEventPolicyRow;
  tenantClubName: string;
};

export function buildMatchActivityPresentation(
  input: BuildMatchPresentationInput,
): SportingActivityPresentation {
  const mode = normalizeSportingLocationMode(input.homeAway);
  const pitch = resolvePitchPresentationLabel(input.pitchCode, input.pitchLabel);

  const identity = input.policy
    ? resolveMatchParticipantIdentity(
        input.policy,
        {
          opponentName: input.opponentName ?? null,
          ownTeamDisplayName: input.teamName ?? null,
        },
        input.tenantClubName,
        null,
        new Map(),
      )
    : null;

  const ownTeam = meaningful(input.teamName);
  const opponent = meaningful(input.opponentName);
  let fixtureLine = input.title;
  if (identity && (identity.home.displayName || identity.away.displayName)) {
    fixtureLine = `${identity.home.displayName ?? "—"} – ${identity.away.displayName ?? "—"}`;
  } else if (mode === "AWAY" && opponent && ownTeam) {
    fixtureLine = `${opponent} – ${ownTeam}`;
  } else if (mode === "HOME" && ownTeam && opponent) {
    fixtureLine = `${ownTeam} – ${opponent}`;
  } else if (ownTeam && opponent) {
    fixtureLine = `${ownTeam} – ${opponent}`;
  }

  const awayHost =
    mode === "AWAY"
      ? meaningful(identity?.home.displayName) ??
        meaningful(input.opponentName) ??
        undefined
      : undefined;

  const location = buildSportingActivityLocation({
    mode,
    hostOrOrganiser: mode === "NEUTRAL" ? input.tenantClubName : awayHost,
    venueName: input.location,
    facilityResource: pitch,
  });

  return {
    identity: {
      resourceKey: input.resourceKey,
      title: input.title,
      typeLabel: input.typeLabel,
      activityKind: "MATCH",
    },
    schedule: {
      startAt: input.startAt.toISOString(),
      endAt: input.endAt ? input.endAt.toISOString() : null,
      allDay: input.allDay,
    },
    team: input.teamName?.trim() ? { name: input.teamName.trim() } : undefined,
    participants: {
      fixtureLine,
      opponentName: meaningful(input.opponentName),
      homeAway: mode,
    },
    context: {
      competitionLabel: meaningful(input.competitionLabel),
    },
    location,
    status: input.status,
    eventType: "MATCH",
  };
}

export type BuildTournamentPresentationInput = {
  resourceKey: string;
  title: string;
  typeLabel: string;
  teamName?: string | null;
  organiserName?: string | null;
  location?: string | null;
  pitchCode?: string | null;
  pitchLabel?: string | null;
  startAt: Date;
  endAt?: Date | null;
  allDay?: boolean;
  status?: PersonalProgrammePresentationStatus;
};

export function buildTournamentActivityPresentation(
  input: BuildTournamentPresentationInput,
): SportingActivityPresentation {
  const pitch = resolvePitchPresentationLabel(input.pitchCode, input.pitchLabel);
  const organiser = meaningful(input.organiserName);

  const location = buildSportingActivityLocation({
    mode: "NEUTRAL",
    venueName: input.location,
    facilityResource: pitch,
  });

  return {
    identity: {
      resourceKey: input.resourceKey,
      title: input.title,
      typeLabel: input.typeLabel,
      activityKind: "TOURNAMENT",
    },
    schedule: {
      startAt: input.startAt.toISOString(),
      endAt: input.endAt ? input.endAt.toISOString() : null,
      allDay: input.allDay,
    },
    team: input.teamName?.trim() ? { name: input.teamName.trim() } : undefined,
    context: organiser ? { organiser } : undefined,
    location,
    status: input.status,
    eventType: "TOURNAMENT",
  };
}

export type BuildGenericEventPresentationInput = {
  resourceKey: string;
  title: string;
  typeLabel: string;
  activityKind?: SportingActivityKind;
  eventType?: EventType;
  teamName?: string | null;
  location?: string | null;
  startAt: Date;
  endAt?: Date | null;
  allDay?: boolean;
  status?: PersonalProgrammePresentationStatus;
};

export function buildGenericSportingEventPresentation(
  input: BuildGenericEventPresentationInput,
): SportingActivityPresentation {
  const kind = input.activityKind ?? "EVENT";
  const location = buildSportingActivityLocation({
    mode: "UNKNOWN",
    venueName: input.location,
  });

  return {
    identity: {
      resourceKey: input.resourceKey,
      title: input.title,
      typeLabel: input.typeLabel,
      activityKind: kind,
    },
    schedule: {
      startAt: input.startAt.toISOString(),
      endAt: input.endAt ? input.endAt.toISOString() : null,
      allDay: input.allDay,
    },
    team: input.teamName?.trim() ? { name: input.teamName.trim() } : undefined,
    location,
    status: input.status,
    eventType: input.eventType,
  };
}

export function applyPresentationToProgrammeFields(
  presentation: SportingActivityPresentation,
  options: { tenantDisplayNames?: string[] } = {},
): {
  title: string;
  subtitle?: string;
  venue?: string;
} {
  const { title, subtitle, venueSummary } = formatSportingActivityPresentationFields(
    presentation,
    options,
  );
  return { title, subtitle, venue: venueSummary };
}

function formatSportingActivityPresentationFields(
  presentation: SportingActivityPresentation,
  options: { tenantDisplayNames?: string[] },
) {
  return formatSportingActivityPresentation(presentation, "standard", options);
}

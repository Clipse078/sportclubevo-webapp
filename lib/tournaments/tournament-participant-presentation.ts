import type { TournamentComposerParticipantRow } from "@/lib/tournaments/composer/tournament-composer-draft-types";
import type { TournamentParticipantDraftKind } from "@/lib/tournaments/create-tournament-orchestration";
import {
  buildClubIdentity,
  resolveClubIdentityEffectiveLogoUrl,
  type ClubIdentity,
} from "@/lib/sporting-activity-design/club-identity";
import { resolveSceTournamentHauptteamDisplayName } from "@/lib/sporting-activity-presentation/canonical/tournament-hauptteam-display";
import type { TournamentPlanungFixtureSidePresentation } from "@/lib/tournaments/planung/types";

export type TournamentLobbyGridDensity = "spacious" | "balanced" | "dense";

export type TournamentLobbyParticipantIdentity = {
  localId: string;
  kind: TournamentParticipantDraftKind;
  accessibleLabel: string;
  clubLine: string;
  designationLine: string | null;
  kindBadge: string | null;
  identity: ClubIdentity;
};

export function resolveTournamentLobbyGridDensity(participantCount: number): TournamentLobbyGridDensity {
  if (participantCount <= 4) return "spacious";
  if (participantCount <= 8) return "balanced";
  return "dense";
}

export function normalizeTournamentParticipantKey(value: string): string {
  return value.trim().toLowerCase();
}

export function isDuplicateTournamentParticipant(
  participants: readonly TournamentComposerParticipantRow[],
  candidate: Pick<TournamentComposerParticipantRow, "kind" | "teamId" | "externalClubId" | "manualLabel">,
): boolean {
  if (candidate.kind === "TEAM") {
    return false;
  }
  if (candidate.kind === "EXTERNAL_CLUB" && candidate.externalClubId) {
    return participants.some(
      (p) => p.kind === "EXTERNAL_CLUB" && p.externalClubId === candidate.externalClubId,
    );
  }
  if (candidate.kind === "MANUAL" && candidate.manualLabel) {
    const key = normalizeTournamentParticipantKey(candidate.manualLabel);
    return participants.some(
      (p) =>
        p.kind === "MANUAL" &&
        p.manualLabel &&
        normalizeTournamentParticipantKey(p.manualLabel) === key,
    );
  }
  return false;
}

export function buildTournamentLobbyParticipantIdentity(input: {
  participant: TournamentComposerParticipantRow;
  tenantClubName: string;
  tenantLogoUrl: string | null;
}): TournamentLobbyParticipantIdentity {
  const { participant, tenantClubName, tenantLogoUrl } = input;

  if (participant.kind === "TEAM") {
    const rawTeamName = participant.displayName.split(" · ")[0]?.trim() || participant.displayName;
    const designation =
      resolveSceTournamentHauptteamDisplayName({
        hauptteamName: rawTeamName,
        organiserDisplayName: tenantClubName,
      }) ?? rawTeamName;
    const identity = buildClubIdentity({
      id: participant.teamId,
      displayName: tenantClubName || rawTeamName,
      logoUrl: tenantLogoUrl,
    });
    const accessibleLabel = [tenantClubName, designation, "Eigenes Team"].filter(Boolean).join(", ");
    return {
      localId: participant.localId,
      kind: participant.kind,
      accessibleLabel,
      clubLine: tenantClubName || rawTeamName,
      designationLine: designation,
      kindBadge: "EIGENES TEAM",
      identity,
    };
  }

  if (participant.kind === "EXTERNAL_CLUB") {
    const clubName = participant.displayName.trim();
    const identity = buildClubIdentity({
      id: participant.externalClubId,
      displayName: clubName,
      shortName: null,
      logoUrl: participant.externalClubLogoUrl ?? null,
    });
    return {
      localId: participant.localId,
      kind: participant.kind,
      accessibleLabel: `${clubName}, externer Verein`,
      clubLine: clubName,
      designationLine: participant.subLabel,
      kindBadge: null,
      identity,
    };
  }

  const label = participant.manualLabel?.trim() || participant.displayName.trim();
  const identity = buildClubIdentity({
    displayName: label,
    preferNeutralIcon: true,
  });
  return {
    localId: participant.localId,
    kind: participant.kind,
    accessibleLabel: `${label}, manueller Teilnehmer`,
    clubLine: label,
    designationLine: participant.subLabel,
    kindBadge: "MANUELL",
    identity,
  };
}

export function buildTournamentLobbyParticipantIdentities(input: {
  participants: readonly TournamentComposerParticipantRow[];
  tenantClubName: string;
  tenantLogoUrl: string | null;
}): TournamentLobbyParticipantIdentity[] {
  return input.participants.map((participant) =>
    buildTournamentLobbyParticipantIdentity({
      participant,
      tenantClubName: input.tenantClubName,
      tenantLogoUrl: input.tenantLogoUrl,
    }),
  );
}

/** Composer Spielplan preview fixture side — same crest resolution as lobby / resource rows. */
export function buildComposerParticipantFixtureSidePresentation(input: {
  participants: readonly TournamentComposerParticipantRow[];
  participantLocalId: string;
  tenantClubName: string;
  tenantLogoUrl: string | null;
}): TournamentPlanungFixtureSidePresentation {
  const row = input.participants.find((p) => p.localId === input.participantLocalId);
  const label = row?.displayName?.trim() || input.participantLocalId;
  if (!row) {
    return {
      label,
      crestUrl: null,
      isPlaceholder: true,
      participantId: input.participantLocalId,
      qualificationProvenanceLabel: null,
    };
  }

  const lobbyIdentity = buildTournamentLobbyParticipantIdentity({
    participant: row,
    tenantClubName: input.tenantClubName,
    tenantLogoUrl: input.tenantLogoUrl,
  });

  return {
    label,
    crestUrl: resolveClubIdentityEffectiveLogoUrl(lobbyIdentity.identity),
    isPlaceholder: row.kind === "MANUAL",
    participantId: row.localId,
    qualificationProvenanceLabel: null,
  };
}

/** Compact resource-assignment row labels derived from the same lobby identity model. */
export type TournamentResourceDressingRoomSubjectPresentation = {
  localId: string;
  subjectLabel: string;
  subjectSecondary: string | null;
  accessibleLabel: string;
  identity: ClubIdentity;
};

function resourceRowSecondaryLabel(
  identity: TournamentLobbyParticipantIdentity,
): string | null {
  const secondary = identity.designationLine?.trim() || null;
  if (!secondary || secondary === identity.clubLine) return null;
  if (identity.kind === "EXTERNAL_CLUB" && secondary === "Externer Verein") return null;
  if (identity.kind === "MANUAL" && secondary === "Manuell") return null;
  return secondary;
}

export function buildTournamentResourceDressingRoomSubjectPresentation(
  model: TournamentLobbyParticipantIdentity,
): TournamentResourceDressingRoomSubjectPresentation {
  return {
    localId: model.localId,
    subjectLabel: model.clubLine,
    subjectSecondary: resourceRowSecondaryLabel(model),
    accessibleLabel: model.accessibleLabel,
    identity: model.identity,
  };
}

export function buildTournamentResourceDressingRoomSubjectPresentations(input: {
  participants: readonly TournamentComposerParticipantRow[];
  tenantClubName: string;
  tenantLogoUrl: string | null;
}): TournamentResourceDressingRoomSubjectPresentation[] {
  return buildTournamentLobbyParticipantIdentities(input).map((model) =>
    buildTournamentResourceDressingRoomSubjectPresentation(model),
  );
}

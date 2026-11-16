import { buildClubIdentity, type ClubIdentity } from "@/lib/sporting-activity-design/club-identity";
import { resolveSceClubEventPrimaryVisualIdentity } from "./club-event-visual-identity";
import { formatSceTournamentOwnTeamsCompactLabel } from "./tournament-own-teams-display";
import type {
  SceActivityPresentationModel,
  SceClubEventPresentationModel,
  SceMatchPresentationModel,
  SceMeetingPresentationModel,
  SceTournamentPresentationModel,
  SceTrainingPresentationModel,
} from "./types";
import {
  isSceClubEventPresentationModel,
  isSceMatchPresentationModel,
  isSceMeetingPresentationModel,
  isSceTrainingPresentationModel,
  isSceTournamentPresentationModel,
} from "./types";

export type ProgrammeDashboardPreviewClubIdentity = {
  crestIdentity?: ClubIdentity | null;
  clubName?: string;
  unitLabel?: string;
};

function normalizeCompare(value: string): string {
  return value.trim().toLocaleLowerCase("de-CH");
}

function clubNameFromIdentity(identity: ClubIdentity | null | undefined): string | undefined {
  const name = identity?.displayName?.trim();
  return name || undefined;
}

function unitDistinctFromClub(unitLabel: string | undefined, clubName: string | undefined): string | undefined {
  if (!unitLabel?.trim()) return undefined;
  const unit = unitLabel.trim();
  if (!clubName) return unit;
  if (normalizeCompare(unit) === normalizeCompare(clubName)) {
    return undefined;
  }
  if (normalizeCompare(unit).includes(normalizeCompare(clubName))) {
    return unit;
  }
  return unit;
}

function unitDistinctFromTitle(
  unitLabel: string | undefined,
  authoredTitle: string | undefined,
): string | undefined {
  if (!unitLabel?.trim() || !authoredTitle?.trim()) return unitLabel?.trim();
  const unit = unitLabel.trim();
  if (authoredTitle.toLocaleLowerCase("de-CH").includes(unit.toLocaleLowerCase("de-CH"))) {
    return undefined;
  }
  return unit;
}

function buildPreviewClubIdentity(
  crestIdentity: ClubIdentity | null | undefined,
  unitCandidate: string | undefined,
): ProgrammeDashboardPreviewClubIdentity | null {
  const clubName = clubNameFromIdentity(crestIdentity ?? undefined);
  const unitLabel = unitDistinctFromClub(unitCandidate, clubName);

  if (!clubName && !unitLabel && !crestIdentity) {
    return null;
  }

  return {
    crestIdentity:
      crestIdentity ?? (clubName ? buildClubIdentity({ displayName: clubName }) : undefined),
    clubName,
    unitLabel,
  };
}

function resolveTrainingDashboardPreviewIdentity(
  model: SceTrainingPresentationModel,
): ProgrammeDashboardPreviewClubIdentity | null {
  const authoredTitle = model.trainingTitle.trim() || model.team?.name?.trim();
  const teamName = model.team?.name?.trim();
  const base = buildPreviewClubIdentity(model.tenantClub, teamName);
  if (!base) return null;
  return {
    ...base,
    unitLabel: unitDistinctFromTitle(base.unitLabel, authoredTitle),
  };
}

function resolveMeetingDashboardPreviewIdentity(
  model: SceMeetingPresentationModel,
): ProgrammeDashboardPreviewClubIdentity | null {
  return buildPreviewClubIdentity(model.tenantClub, model.organisationalContext?.trim());
}

function resolveClubEventDashboardPreviewIdentity(
  model: SceClubEventPresentationModel,
): ProgrammeDashboardPreviewClubIdentity | null {
  const crest = resolveSceClubEventPrimaryVisualIdentity(model);
  return buildPreviewClubIdentity(crest, undefined);
}

function resolveTournamentDashboardPreviewIdentity(
  model: SceTournamentPresentationModel,
): ProgrammeDashboardPreviewClubIdentity | null {
  const unit = formatSceTournamentOwnTeamsCompactLabel({
    teamNames: model.ownTeams ?? (model.hauptteam?.name ? [model.hauptteam.name] : []),
    organiserDisplayName: model.organiser.displayName,
  });
  return buildPreviewClubIdentity(model.organiser, unit);
}

function resolveTenantFixtureClub(model: SceMatchPresentationModel): ClubIdentity | undefined {
  const tenantSide = model.contextBadges?.find((badge) => badge.kind === "tenant-side");
  if (tenantSide?.label === "Auswärts") {
    return model.fixture.away;
  }
  return model.fixture.home;
}

function resolveMatchDashboardPreviewIdentity(
  model: SceMatchPresentationModel,
): ProgrammeDashboardPreviewClubIdentity | null {
  const crest = resolveTenantFixtureClub(model);
  const unit =
    model.teamContext?.name?.trim() || model.competition?.label?.trim() || undefined;
  return buildPreviewClubIdentity(crest, unit);
}

export function resolveProgrammeDashboardPreviewClubIdentity(
  model: SceActivityPresentationModel,
): ProgrammeDashboardPreviewClubIdentity | null {
  if (isSceTrainingPresentationModel(model)) {
    return resolveTrainingDashboardPreviewIdentity(model);
  }
  if (isSceMeetingPresentationModel(model)) {
    return resolveMeetingDashboardPreviewIdentity(model);
  }
  if (isSceClubEventPresentationModel(model)) {
    return resolveClubEventDashboardPreviewIdentity(model);
  }
  if (isSceTournamentPresentationModel(model)) {
    return resolveTournamentDashboardPreviewIdentity(model);
  }
  if (isSceMatchPresentationModel(model)) {
    return resolveMatchDashboardPreviewIdentity(model);
  }
  return null;
}
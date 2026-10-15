import type { SportingActivityPresentation } from "@/lib/sporting-activity-presentation/types";
import {
  isSceClubEventPresentationModel,
  isSceMatchPresentationModel,
  isSceTrainingPresentationModel,
  isSceTournamentPresentationModel,
  type SceActivityPresentationModel,
} from "../types";

function externalAssociationIdAsString(
  value: string | number | null | undefined,
): string | null | undefined {
  if (value == null) return value ?? null;
  return String(value);
}

function normalizePresentationStatus(
  domain: string | undefined,
): SportingActivityPresentation["status"] | undefined {
  if (!domain) return undefined;
  const normalized = domain.toLowerCase();
  if (
    normalized === "scheduled" ||
    normalized === "cancelled" ||
    normalized === "postponed" ||
    normalized === "completed" ||
    normalized === "live"
  ) {
    return normalized;
  }
  return undefined;
}

/**
 * Rehydrates UX-01 {@link SportingActivityPresentation} from a canonical SCE model.
 * Used by dashboard / calendar consumers that still render through the legacy read-model contract.
 */
export function resolveLegacySportingActivityPresentationFromSce(
  model: SceActivityPresentationModel,
): SportingActivityPresentation {
  if (isSceTrainingPresentationModel(model)) {
    return {
      identity: {
        resourceKey: model.resourceKey,
        title: model.trainingTitle,
        typeLabel: model.typeLabel,
        activityKind: "TRAINING",
      },
      schedule: { ...model.schedule },
      team: model.team?.name ? { name: model.team.name } : undefined,
      location: { ...model.location },
      dressingRoomLabel: model.dressingRoom?.label?.trim() || undefined,
      status: normalizePresentationStatus(
        typeof model.status?.domain === "string" ? model.status.domain : undefined,
      ),
      tenantClub: model.tenantClub?.displayName
        ? { logoUrl: model.tenantClub.logoUrl ?? null }
        : undefined,
    };
  }

  if (isSceMatchPresentationModel(model)) {
    const home = model.fixture.home.displayName.trim();
    const away = model.fixture.away.displayName.trim();
    const fixtureLine = home && away ? `${home} – ${away}` : home || away || model.typeLabel;
    const tenantSide = model.contextBadges?.find((badge) => badge.kind === "tenant-side");
    const homeAway =
      tenantSide?.label === "Heim"
        ? "HOME"
        : tenantSide?.label === "Auswärts"
          ? "AWAY"
          : model.location.mode;

    return {
      identity: {
        resourceKey: model.resourceKey,
        title: fixtureLine,
        typeLabel: model.typeLabel,
        activityKind: "MATCH",
      },
      schedule: {
        startAt: model.schedule.startAt,
        endAt: model.schedule.endAt ?? null,
        allDay: model.schedule.allDay,
        meetingAt: model.schedule.meetingAt,
      },
      participants: {
        fixtureLine,
        homeAway,
      },
      context: model.competition?.label
        ? { competitionLabel: model.competition.label }
        : undefined,
      location: { ...model.location },
      status: normalizePresentationStatus(
        typeof model.status?.domain === "string" ? model.status.domain : undefined,
      ),
    };
  }

  if (isSceTournamentPresentationModel(model)) {
    return {
      identity: {
        resourceKey: model.resourceKey,
        title: model.tournamentTitle,
        typeLabel: model.typeLabel,
        activityKind: "TOURNAMENT",
      },
      schedule: { ...model.schedule },
      team: model.hauptteam?.name ? { name: model.hauptteam.name } : undefined,
      context: {
        organiser: model.organiser.displayName,
        organiserLogoUrl: model.organiser.logoUrl ?? null,
        organiserExternalClubId: externalAssociationIdAsString(model.organiser.externalAssociationId),
      },
      location: { ...model.location },
      status: normalizePresentationStatus(
        typeof model.status?.domain === "string" ? model.status.domain : undefined,
      ),
    };
  }

  if (isSceClubEventPresentationModel(model)) {
    return {
      identity: {
        resourceKey: model.resourceKey,
        title: model.eventTitle,
        typeLabel: model.typeLabel,
        activityKind: "EVENT",
      },
      schedule: { ...model.schedule },
      location: { ...model.location },
      context: model.organiser?.displayName
        ? {
            organiser: model.organiser.displayName,
            organiserLogoUrl: model.organiser.logoUrl ?? null,
            organiserExternalClubId: externalAssociationIdAsString(model.organiser.externalAssociationId),
          }
        : undefined,
      tenantClub: model.tenantClub?.displayName
        ? { logoUrl: model.tenantClub.logoUrl ?? null }
        : undefined,
      status: normalizePresentationStatus(
        typeof model.status?.domain === "string" ? model.status.domain : undefined,
      ),
    };
  }

  const _exhaustive: never = model;
  throw new Error(`Unsupported SceActivityPresentationModel kind: ${(_exhaustive as { kind: string }).kind}`);
}

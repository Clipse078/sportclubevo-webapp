import { listTrainingSessions } from "@/lib/training/session-generation-service";
import {
  isPersonalTrainingSessionRowRelevant,
  resolvePersonalTeamIdForTeamSeason,
  resolveTeamEventContextLabel,
} from "@/lib/dashboard/personal-context";
import { buildPersonalTeamEventQueryScope } from "../personal-programme-universe";
import {
  canIncludeTrainingSessionInPersonalProjection,
  type PersonalTrainingSessionAuthorizationRow,
} from "../training-projection-access";
import type { PersonalEventProjectionActor } from "../event-projection-access";
import {
  programmeResourceKey,
  type PersonalProgrammeItem,
} from "../personal-programme-types";
import { resolveTrainingSessionDateBoundsForProgrammeRange } from "../training-programme-range";
import type { PersonalProgrammeAdapterContext } from "@/lib/dashboard/personal-context/programme-adapter-contract";

function normalizeTrainingProgrammeStatus(
  status: string,
): PersonalProgrammeItem["status"] {
  switch (status) {
    case "SCHEDULED":
      return "scheduled";
    case "CANCELLED":
      return "cancelled";
    case "POSTPONED":
    case "MOVED":
      return "postponed";
    default:
      return undefined;
  }
}

export async function loadTrainingProgrammeItems(
  ctx: PersonalProgrammeAdapterContext,
): Promise<PersonalProgrammeItem[]> {
  const { teamSeasonIds } = buildPersonalTeamEventQueryScope(ctx.personal);
  if (teamSeasonIds.length === 0) {
    return [];
  }

  const actor: PersonalEventProjectionActor = {
    userId: ctx.personal.userId,
    tenantId: ctx.personal.tenantId,
    permissionKeys: ctx.permissionKeys,
  };

  const { dateFrom, dateTo } = resolveTrainingSessionDateBoundsForProgrammeRange({
    rangeStart: ctx.rangeStart,
    rangeEnd: ctx.rangeEnd,
    timeZone: ctx.timeZone,
  });

  const sessions = await listTrainingSessions(ctx.personal.tenantId, {
    teamSeasonIds,
    dateFrom,
    dateTo,
  });

  const rangeStartMs = ctx.rangeStart.getTime();
  const rangeEndMs = ctx.rangeEnd.getTime();
  const items: PersonalProgrammeItem[] = [];
  const seen = new Set<string>();

  for (const session of sessions) {
    const authRow: PersonalTrainingSessionAuthorizationRow = {
      id: session.id,
      tenantId: session.tenantId,
      teamSeasonId: session.teamSeasonId,
      status: session.status,
    };

    if (!isPersonalTrainingSessionRowRelevant(ctx.personal, authRow)) {
      continue;
    }
    if (!canIncludeTrainingSessionInPersonalProjection(actor, authRow)) {
      continue;
    }

    const startsAt = new Date(session.startAt);
    const startMs = startsAt.getTime();
    if (startMs < rangeStartMs || startMs > rangeEndMs) {
      continue;
    }

    const resourceKey = programmeResourceKey("TRAINING", session.id);
    if (seen.has(resourceKey)) continue;
    seen.add(resourceKey);

    const teamId = resolvePersonalTeamIdForTeamSeason(ctx.personal, session.teamSeasonId);
    const contextLabel = resolveTeamEventContextLabel(ctx.personal, teamId);
    const title = session.trainingSeriesTitle?.trim() || "Training";
    const teamName = session.teamName?.trim() || undefined;
    const endsAt = session.endAt ? new Date(session.endAt) : null;

    items.push({
      id: resourceKey,
      sourceType: "TRAINING",
      startsAt,
      endsAt,
      allDay: false,
      title,
      subtitle: teamName,
      contextLabel,
      status: normalizeTrainingProgrammeStatus(session.status),
      deepLink: `/dashboard/training/sessions/${session.id}/edit`,
      teamName,
      typeLabel: "Training",
      ariaLabel: `Training: ${title}`,
    });
  }

  return items;
}

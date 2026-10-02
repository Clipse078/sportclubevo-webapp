import { prisma } from "@/lib/db/prisma";
import { isPersonalTrainingSessionRowRelevant } from "@/lib/dashboard/personal-context";
import { formatPersonName } from "@/lib/communication/personalisation/formatters";
import { buildTrainingActivityPresentation } from "@/lib/sporting-activity-presentation/builders";
import { loadTrainingSessionFacilityHints } from "@/lib/sporting-activity-presentation/training-facility-batch";
import { programmeResourceKey } from "@/lib/personal-agenda/personal-programme-types";
import {
  canIncludeTrainingSessionInPersonalProjection,
  type PersonalTrainingSessionAuthorizationRow,
} from "@/lib/personal-agenda/training-projection-access";
import type { PersonalEventProjectionActor } from "@/lib/personal-agenda/event-projection-access";
import { getTrainingSession } from "@/lib/training/session-generation-service";
import { normalizeTrainingProgrammeStatus } from "@/lib/sporting-activity-detail/normalize-training-status";
import { loadSportingActivityDetailParticipation } from "./participation";
import { buildSportingActivityDetailParticipantTeam } from "./participant-team";
import { resolveSportingActivityDetailRouteTarget } from "./route-target";
import type { LoadSportingActivityDetailResult, SportingActivityDetail } from "./types";

export async function loadTrainingActivityDetail(input: {
  tenantId: string;
  userId: string;
  personId: string | null;
  permissionKeys: string[];
  personal: Awaited<ReturnType<typeof import("@/lib/dashboard/personal-context").resolvePersonalContext>>;
  sessionId: string;
  tenantClubName: string;
  tenantLogoUrl: string | null;
}): Promise<LoadSportingActivityDetailResult> {
  let session;
  try {
    session = await getTrainingSession(input.tenantId, input.sessionId);
  } catch {
    return { ok: false, reason: "not_found" };
  }

  const authRow: PersonalTrainingSessionAuthorizationRow = {
    id: session.id,
    tenantId: session.tenantId,
    teamSeasonId: session.teamSeasonId,
    status: session.status,
  };

  const actor: PersonalEventProjectionActor = {
    userId: input.userId,
    tenantId: input.tenantId,
    permissionKeys: input.permissionKeys,
  };

  if (!isPersonalTrainingSessionRowRelevant(input.personal, authRow)) {
    return { ok: false, reason: "forbidden" };
  }
  if (!canIncludeTrainingSessionInPersonalProjection(actor, authRow)) {
    return { ok: false, reason: "forbidden" };
  }

  const resourceKey = programmeResourceKey("TRAINING", session.id);
  const [facilityHints, series, trainers] = await Promise.all([
    loadTrainingSessionFacilityHints(input.tenantId, [
      { id: session.id, trainingSeriesId: session.trainingSeriesId },
    ]),
    prisma.trainingSeries.findFirst({
      where: { id: session.trainingSeriesId, tenantId: input.tenantId },
      select: { description: true },
    }),
    prisma.trainerTeamMember.findMany({
      where: {
        teamSeasonId: session.teamSeasonId,
        status: "ACTIVE",
        teamSeason: { team: { tenantId: input.tenantId } },
      },
      orderBy: { sortOrder: "asc" },
      select: {
        roleLabel: true,
        person: { select: { firstName: true, lastName: true, displayName: true } },
      },
    }),
  ]);

  const facility = facilityHints.get(session.id);
  const teamName = session.teamName?.trim() || undefined;
  const startsAt = new Date(session.startAt);
  const endsAt = session.endAt ? new Date(session.endAt) : null;
  const status = normalizeTrainingProgrammeStatus(session.status);

  const presentation = buildTrainingActivityPresentation({
    resourceKey,
    title: session.trainingSeriesTitle?.trim() || "Training",
    typeLabel: "Training",
    teamName,
    clubName: input.tenantClubName,
    startAt: startsAt,
    endAt: endsAt,
    status,
    facilityName: facility?.facilityName,
    pitchResourceName: facility?.pitchResourceName,
  });

  const participation = await loadSportingActivityDetailParticipation({
    tenantId: input.tenantId,
    actorUserId: input.userId,
    personId: input.personId,
    teamSeasonId: session.teamSeasonId,
    kind: "TRAINING",
    trainingSessionId: session.id,
  });

  const participantInformation: SportingActivityDetail["participantInformation"] = [];
  const seriesDescription = series?.description?.trim();
  if (seriesDescription) {
    participantInformation.push({ label: "Hinweise", value: seriesDescription });
  }

  const trainerRows = trainers
    .map((row) => ({
      name: formatPersonName(row.person),
      roleLabel: row.roleLabel,
    }))
    .filter((row) => row.name.trim());

  const participantTeam = buildSportingActivityDetailParticipantTeam({
    tenantClubName: input.tenantClubName,
    tenantLogoUrl: input.tenantLogoUrl,
    teamName,
  });

  const detail: SportingActivityDetail = {
    resourceKey,
    kind: "TRAINING",
    presentation,
    teamLabel: teamName,
    participantTeam,
    routeTarget: resolveSportingActivityDetailRouteTarget(presentation),
    participation,
    participantInformation: participantInformation.length > 0 ? participantInformation : undefined,
    training: trainerRows.length > 0 ? { trainers: trainerRows } : undefined,
  };

  return { ok: true, detail };
}

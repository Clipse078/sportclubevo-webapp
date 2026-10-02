import "./sce-perf-preload.mjs";
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { parsePersonalDashboardReadModelPayload } from "@/lib/dashboard/read-model/payload-codec";
import { buildPersonalDashboardReadModelPayload } from "@/lib/dashboard/read-model/rebuild";
import { loadTrainingProgrammeItems } from "@/lib/personal-agenda/adapters/training-programme-adapter";
import { loadTeamEventProgrammeItems } from "@/lib/personal-agenda/adapters/team-event-programme-adapter";
import { resolvePersonalContext } from "@/lib/dashboard/personal-context";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import type { PermissionKey } from "@/lib/permissions/permissions";
import { loadTrainingSessionFacilityHints } from "@/lib/sporting-activity-presentation/training-facility-batch";
import { buildTrainingActivityPresentation } from "@/lib/sporting-activity-presentation/builders";
import { formatSportingActivityCompactAgendaClubLocationLine } from "@/lib/sporting-activity-presentation/compact";
import { programmeResourceKey } from "@/lib/personal-agenda/personal-programme-types";

async function main(): Promise<void> {
  const email = process.argv.find((a) => a.startsWith("--email="))?.split("=")[1] ?? "it@fcallschwil.ch";
  const tenantKey =
    process.argv.find((a) => a.startsWith("--tenant="))?.split("=")[1] ?? "fc-allschwil";

  const tenant = await prisma.tenant.findFirst({
    where: { key: tenantKey },
    select: { id: true, key: true, name: true, locale: true, timezone: true },
  });
  const user = await prisma.user.findFirst({
    where: { email },
    select: { id: true, email: true },
  });

  if (!tenant || !user) {
    console.log(JSON.stringify({ error: "NOT_FOUND", tenantKey, email }, null, 2));
    process.exit(2);
  }

  const timeZone = tenant.timezone ?? "Europe/Zurich";

  const trainingSession = await prisma.trainingSession.findFirst({
    where: {
      tenantId: tenant.id,
      startAt: {
        gte: new Date("2026-10-05T14:00:00.000Z"),
        lte: new Date("2026-10-05T18:00:00.000Z"),
      },
      trainingSeries: { title: { contains: "Junioren F2", mode: "insensitive" } },
    },
    select: {
      id: true,
      tenantId: true,
      teamSeasonId: true,
      startAt: true,
      endAt: true,
      status: true,
      trainingSeriesId: true,
      trainingSeries: { select: { title: true } },
      teamSeason: {
        select: {
          team: { select: { id: true, name: true } },
        },
      },
    },
  });

  const tournamentEvent = await prisma.event.findFirst({
    where: {
      tenantId: tenant.id,
      type: "TOURNAMENT",
      title: { contains: "PlayMore", mode: "insensitive" },
      startAt: {
        gte: new Date("2026-10-10T06:00:00.000Z"),
        lte: new Date("2026-10-10T12:00:00.000Z"),
      },
    },
    select: {
      id: true,
      title: true,
      type: true,
      startAt: true,
      endAt: true,
      organizerName: true,
      location: true,
      homeAway: true,
      pitchCode: true,
      team: { select: { name: true } },
    },
  });

  const readModel = await prisma.personalDashboardReadModel.findUnique({
    where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
    select: {
      id: true,
      projectionVersion: true,
      payloadJson: true,
      builtAt: true,
      updatedAt: true,
      horizonStart: true,
      horizonEnd: true,
    },
  });

  const parsedPayload = readModel
    ? parsePersonalDashboardReadModelPayload(readModel.payloadJson)
    : null;

  const permissions = await getRequestEffectivePermissions(user.id, tenant.id);
  const permissionKeys = [...permissions.platform, ...permissions.tenant] as PermissionKey[];
  const personalContext = await resolvePersonalContext({
    tenantId: tenant.id,
    userId: user.id,
  });

  const adapterCtx = {
    personal: personalContext,
    permissionKeys,
    rangeStart: new Date("2026-09-01T00:00:00.000Z"),
    rangeEnd: new Date("2026-11-30T23:59:59.999Z"),
    timeZone,
  };

  const [trainingItems, eventItems] = await Promise.all([
    loadTrainingProgrammeItems(adapterCtx),
    loadTeamEventProgrammeItems(adapterCtx),
  ]);

  const trainingItem = trainingItems.find(
    (item) =>
      item.title.includes("Junioren F2") &&
      item.startsAt.toISOString().startsWith("2026-10-05"),
  );
  const tournamentItem = eventItems.find(
    (item) =>
      item.title.includes("PlayMore") &&
      item.startsAt.toISOString().startsWith("2026-10-10"),
  );

  let trainingTrace: Record<string, unknown> = { found: false };
  if (trainingSession) {
    const hints = await loadTrainingSessionFacilityHints(tenant.id, [
      { id: trainingSession.id, trainingSeriesId: trainingSession.trainingSeriesId },
    ]);
    const facility = hints.get(trainingSession.id);
    const resourceKey = programmeResourceKey("TRAINING", trainingSession.id);
    const activityPresentation = buildTrainingActivityPresentation({
      resourceKey,
      title: trainingSession.trainingSeries.title,
      typeLabel: "Training",
      teamName: trainingSession.teamSeason.team.name,
      clubName: tenant.name,
      startAt: trainingSession.startAt,
      endAt: trainingSession.endAt,
      facilityName: facility?.facilityName,
      pitchResourceName: facility?.pitchResourceName,
    });
    const compactLine = formatSportingActivityCompactAgendaClubLocationLine(
      activityPresentation,
      { meinProgrammContract: true },
    );

    trainingTrace = {
      found: true,
      TRAINING_SOURCE: {
        tenant: tenant.name,
        team: trainingSession.teamSeason.team.name,
        trainingSeries: trainingSession.trainingSeries.title,
        trainingSession: trainingSession.id,
        date: trainingSession.startAt.toISOString(),
        startTime: trainingSession.startAt.toISOString(),
        endTime: trainingSession.endAt?.toISOString() ?? null,
      },
      EFFECTIVE_ALLOCATION: facility,
      TRAINING_ADAPTER_OUTPUT: trainingItem
        ? {
            title: trainingItem.title,
            subtitle: trainingItem.subtitle,
            venue: trainingItem.venue,
            activityPresentation: trainingItem.activityPresentation,
          }
        : null,
      FORMATTER_OUTPUT: compactLine,
    };
  }

  let tournamentTrace: Record<string, unknown> = { found: false };
  if (tournamentEvent) {
    tournamentTrace = {
      found: true,
      TOURNAMENT_SOURCE: tournamentEvent,
      TOURNAMENT_ADAPTER_OUTPUT: tournamentItem
        ? {
            title: tournamentItem.title,
            subtitle: tournamentItem.subtitle,
            venue: tournamentItem.venue,
            activityPresentation: tournamentItem.activityPresentation,
          }
        : null,
    };
  }

  const pickProgrammeItem = (titlePart: string, dayPrefix: string) => {
    if (!parsedPayload) return null;
    return parsedPayload.programme.items.find(
      (item) =>
        item.title.includes(titlePart) && item.startsAt.toISOString().startsWith(dayPrefix),
    );
  };

  const rmTraining = pickProgrammeItem("Junioren F2", "2026-10-05");
  const rmTournament = pickProgrammeItem("PlayMore", "2026-10-10");

  const summarizeRmItem = (item: typeof rmTraining) => {
    if (!item) return null;
    const ap = item.activityPresentation;
    return {
      kind: item.sourceType,
      title: item.title,
      subtitle: item.subtitle,
      venue: item.venue,
      homeAway: item.homeAway,
      activityPresentationPresent: ap ? "YES" : "NO",
      activityPresentation: ap
        ? {
            type: ap.identity.activityKind,
            locationMode: ap.location.mode,
            hostOrOrganiser: ap.location.hostOrOrganiser,
            venueName: ap.location.venueName,
            resourceName: ap.location.facilityResource,
            contextOrganiser: ap.context?.organiser,
          }
        : null,
    };
  };

  const freshPayload = await buildPersonalDashboardReadModelPayload({
    tenantId: tenant.id,
    userId: user.id,
    fmtCfg: { locale: tenant.locale ?? "de-CH", timezone: timeZone },
    now: new Date("2026-10-02T12:00:00.000Z"),
  });

  const freshTraining = freshPayload.programme.items.find(
    (item) =>
      item.title.includes("Junioren F2") && item.startsAt.toISOString().startsWith("2026-10-05"),
  );
  const freshTournament = freshPayload.programme.items.find(
    (item) =>
      item.title.includes("PlayMore") && item.startsAt.toISOString().startsWith("2026-10-10"),
  );

  console.log(
    JSON.stringify(
      {
        tenant: { id: tenant.id, key: tenant.key, name: tenant.name },
        user: { id: user.id, email: user.email },
        READ_MODEL: readModel
          ? {
              tenantId: tenant.id,
              userId: user.id,
              payloadVersion: parsedPayload?.v,
              projectionVersion: readModel.projectionVersion,
              generatedAt: readModel.builtAt.toISOString(),
              updatedAt: readModel.updatedAt.toISOString(),
              programmeItemCount: parsedPayload?.programme.items.length ?? 0,
              trainingItem: summarizeRmItem(rmTraining),
              tournamentItem: summarizeRmItem(rmTournament),
              itemsMissingPresentation:
                parsedPayload?.programme.items.filter((i) => !i.activityPresentation).length ?? 0,
            }
          : null,
        REAL_FCA_TRAINING_TRACE: trainingTrace,
        REAL_FCA_TOURNAMENT_TRACE: tournamentTrace,
        FRESH_REBUILD_SAMPLE: {
          training: summarizeRmItem(freshTraining),
          tournament: summarizeRmItem(freshTournament),
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

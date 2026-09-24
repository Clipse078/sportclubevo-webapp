/**
 * DASHBOARD-07R1C — read-only STAGE personal calendar forensics.
 * No writes. Use DATABASE_URL pointing at STAGE.
 */
import "dotenv/config";

import { resolvePersonalContext, getPersonallyRelevantTeamIds, isPersonalTeamEventRowRelevant } from "@/lib/dashboard/personal-context";
import { loadPersonalProgramme } from "@/lib/personal-agenda/load-personal-programme";
import { prisma } from "@/lib/db/prisma";
import { resolveDeploymentIdentity } from "@/lib/server/deployment-identity";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { canIncludeEventInPersonalProjection } from "@/lib/personal-agenda/event-projection-access";

const EXPECTED_HOST_FRAGMENT = "ep-wispy-hall-aso93dy6";
const EXPECTED_DB_NAME = "neondb";
const EXPECTED_FINGERPRINT = "acd3b37682911890";
const TENANT_KEY = "fc-allschwil";
const ACTOR_EMAIL = "it@fcallschwil.ch";
const TIME_ZONE = "Europe/Zurich";

const SEPTEMBER_DATES = [
  "2026-09-04",
  "2026-09-06",
  "2026-09-11",
  "2026-09-12",
  "2026-09-18",
  "2026-09-23",
  "2026-09-27",
];

function hostFromDatabaseUrl(url: string | undefined): string | null {
  if (!url?.trim()) return null;
  try {
    return new URL(url.trim()).hostname;
  } catch {
    return null;
  }
}

function dbNameFromUrl(url: string | undefined): string | null {
  if (!url?.trim()) return null;
  try {
    return new URL(url.trim()).pathname.replace(/^\//, "");
  } catch {
    return null;
  }
}

function zurichDayKey(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
}

async function main(): Promise<void> {
  const identity = resolveDeploymentIdentity(process.env);
  const host = hostFromDatabaseUrl(process.env.DATABASE_URL);
  const dbName = dbNameFromUrl(process.env.DATABASE_URL);

  const databaseIdentity = {
    host,
    hostFragmentMatch: Boolean(host?.includes(EXPECTED_HOST_FRAGMENT)),
    databaseName: dbName,
    databaseNameMatch: dbName === EXPECTED_DB_NAME,
    fingerprint: identity.databaseFingerprint,
    fingerprintMatch: identity.databaseFingerprint === EXPECTED_FINGERPRINT,
    environment: process.env.APP_ENV ?? process.env.SCE_DATA_ENVIRONMENT ?? null,
  };

  if (
    !databaseIdentity.hostFragmentMatch ||
    !databaseIdentity.databaseNameMatch ||
    !databaseIdentity.fingerprintMatch
  ) {
    console.log(JSON.stringify({ error: "DATABASE_IDENTITY_MISMATCH", databaseIdentity }, null, 2));
    process.exit(2);
  }

  const tenant = await prisma.tenant.findUnique({
    where: { key: TENANT_KEY },
    select: { id: true, key: true },
  });
  if (!tenant) {
    console.log(JSON.stringify({ error: "TENANT_NOT_FOUND", tenantKey: TENANT_KEY }, null, 2));
    process.exit(2);
  }

  const user = await prisma.user.findFirst({
    where: { email: ACTOR_EMAIL },
    select: { id: true, email: true, isActive: true },
  });
  if (!user) {
    console.log(JSON.stringify({ error: "USER_NOT_FOUND", email: ACTOR_EMAIL }, null, 2));
    process.exit(2);
  }

  const membership = await prisma.tenantMembership.findFirst({
    where: { tenantId: tenant.id, userId: user.id, isActive: true },
    select: { id: true },
  });

  const personalContext = await resolvePersonalContext({
    tenantId: tenant.id,
    userId: user.id,
  });

  const teamIds = getPersonallyRelevantTeamIds(personalContext);
  const teamSeasonIds = personalContext.teams.flatMap((t) => t.teamSeasonIds);

  const { platform, tenant: tenantPerms } = await getRequestEffectivePermissions(
    user.id,
    tenant.id,
  );
  const permissionKeys = [...platform, ...tenantPerms];

  const monthStart = new Date("2026-09-01T00:00:00.000+02:00");
  const monthEnd = new Date("2026-09-30T23:59:59.999+02:00");

  const programme = await loadPersonalProgramme({
    tenantId: tenant.id,
    userId: user.id,
    timeZone: TIME_ZONE,
    from: monthStart,
    to: monthEnd,
    permissionKeys,
  });

  const itemsByDay = new Map<string, typeof programme.items>();
  for (const item of programme.items) {
    const key = zurichDayKey(item.startsAt);
    const list = itemsByDay.get(key) ?? [];
    list.push(item);
    itemsByDay.set(key, list);
  }

  const forensicByDate: Record<string, unknown[]> = {};

  for (const dateKey of SEPTEMBER_DATES) {
    const dayItems = itemsByDay.get(dateKey) ?? [];
    const rows: unknown[] = [];

    for (const item of dayItems) {
      const eventId = item.id.replace(/^event:/, "");
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          tenantId: true,
          type: true,
          status: true,
          title: true,
          teamId: true,
          teamSeasonId: true,
          startAt: true,
          reviewStage: true,
          source: true,
          team: { select: { name: true, shortName: true } },
          teamSeason: { select: { id: true, seasonId: true, season: { select: { name: true } } } },
        },
      });

      const relevance = event
        ? isPersonalTeamEventRowRelevant(personalContext, event)
        : null;
      const auth = event
        ? canIncludeEventInPersonalProjection(
            { userId: user.id, tenantId: tenant.id, permissionKeys },
            event,
          )
        : null;

      const teamRel = event?.teamId
        ? personalContext.teams.find((t) => t.teamId === event.teamId)
        : undefined;

      rows.push({
        date: dateKey,
        sourceType: item.sourceType,
        eventId: event?.id ?? eventId,
        title: item.title,
        teamId: event?.teamId ?? null,
        teamSeasonId: event?.teamSeasonId ?? null,
        teamName: event?.team?.shortName ?? event?.team?.name ?? null,
        eventSource: event?.source ?? null,
        seasonName: event?.teamSeason?.season?.name ?? null,
        relevancePass: relevance,
        authorizationPass: auth,
        personalTeamKinds: teamRel?.kinds ?? [],
        personalTeamSeasonIds: teamRel?.teamSeasonIds ?? [],
        whyIncluded:
          teamRel == null
            ? "no personal team relationship (meeting/other?)"
            : !teamRel.teamSeasonIds.length
              ? "teamId match; empty teamSeasonIds on relationship → teamSeason gate skipped"
              : event?.teamSeasonId == null
                ? "teamId match; event.teamSeasonId null → relevance allows"
                : teamRel.teamSeasonIds.includes(event.teamSeasonId)
                  ? "teamId + teamSeasonId aligned"
                  : "should be filtered",
      });
    }

    if (rows.length === 0) {
      const dayStart = new Date(`${dateKey}T00:00:00+02:00`);
      const dayEnd = new Date(`${dateKey}T23:59:59.999+02:00`);
      const nearbyEvents = await prisma.event.findMany({
        where: {
          tenantId: tenant.id,
          startAt: { gte: dayStart, lte: dayEnd },
          type: { in: ["MATCH", "TOURNAMENT"] },
        },
        select: {
          id: true,
          type: true,
          title: true,
          teamId: true,
          teamSeasonId: true,
          team: { select: { name: true } },
        },
        take: 20,
      });
      rows.push({
        note: "no programme item on this day",
        tenantEventsThatDay: nearbyEvents.map((e) => ({
          id: e.id,
          type: e.type,
          title: e.title,
          teamId: e.teamId,
          teamSeasonId: e.teamSeasonId,
          teamName: e.team?.name,
          inPersonalTeams: e.teamId ? teamIds.includes(e.teamId) : false,
        })),
      });
    }

    forensicByDate[dateKey] = rows;
  }

  const trainerRows = personalContext.personId
    ? await prisma.trainerTeamMember.findMany({
        where: { personId: personalContext.personId, status: "ACTIVE" },
        select: {
          id: true,
          teamSeasonId: true,
          teamSeason: {
            select: {
              id: true,
              teamId: true,
              team: { select: { name: true } },
              season: { select: { name: true } },
            },
          },
        },
      })
    : [];

  const assignmentDetails = personalContext.personId
    ? await prisma.personAssignment.findMany({
        where: { personId: personalContext.personId, tenantId: tenant.id, status: "ACTIVE" },
        select: {
          id: true,
          teamId: true,
          seasonId: true,
          functionKey: true,
          team: { select: { name: true } },
          season: { select: { name: true } },
        },
      })
    : [];

  const teamSeasonsByTeam: Record<string, unknown[]> = {};
  for (const teamId of teamIds) {
    teamSeasonsByTeam[teamId] = await prisma.teamSeason.findMany({
      where: { teamId },
      select: {
        id: true,
        seasonId: true,
        season: { select: { name: true, startDate: true, endDate: true } },
      },
    });
  }

  console.log(
    JSON.stringify(
      {
        databaseIdentity,
        assignmentDetails,
        teamSeasonsByTeam,
        actor: {
          tenantId: tenant.id,
          userId: user.id,
          personId: personalContext.personId,
          membershipId: membership?.id ?? null,
          email: user.email,
        },
        personalContext: {
          teams: personalContext.teams,
          assignments: personalContext.assignments.map((a) => ({
            assignmentId: a.assignmentId,
            teamId: a.teamId,
            orgUnitId: a.orgUnitId,
            functionKey: a.functionKey,
          })),
          orgUnitCount: personalContext.orgUnits.length,
          teamIds,
          teamSeasonIds,
        },
        trainerTeamMemberRows: trainerRows.map((r) => ({
          id: r.id,
          teamSeasonId: r.teamSeasonId,
          teamId: r.teamSeason.teamId,
          teamName: r.teamSeason.team.name,
          seasonName: r.teamSeason.season.name,
        })),
        runtimeProjection: programme.items.map((i) => ({
          date: zurichDayKey(i.startsAt),
          source: i.sourceType,
          title: i.title,
          id: i.id,
          contextLabel: i.contextLabel,
        })),
        forensicByDate,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

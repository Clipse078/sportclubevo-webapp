/**
 * DASHBOARD-07R1D — read-only STAGE personal training forensics.
 * No writes. Requires DATABASE_URL pointing at STAGE.
 */
import "dotenv/config";

import { resolvePersonalContext, getPersonallyRelevantTeamSeasonIds } from "@/lib/dashboard/personal-context";
import { loadPersonalProgramme } from "@/lib/personal-agenda/load-personal-programme";
import { listTrainingSessions } from "@/lib/training/session-generation-service";
import { resolveTrainingSessionDateBoundsForProgrammeRange } from "@/lib/personal-agenda/training-programme-range";
import { prisma } from "@/lib/db/prisma";
import { resolveDeploymentIdentity } from "@/lib/server/deployment-identity";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";

const EXPECTED_HOST_FRAGMENT = "ep-wispy-hall-aso93dy6";
const EXPECTED_DB_NAME = "neondb";
const EXPECTED_FINGERPRINT = "acd3b37682911890";
const TENANT_KEY = "fc-allschwil";
const ACTOR_EMAIL = "it@fcallschwil.ch";
const TIME_ZONE = "Europe/Zurich";

const FORENSIC_WEEKS = {
  currentWeek: ["2026-09-21", "2026-09-23"],
  nextWeek: ["2026-09-28", "2026-09-30"],
};

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
    select: { id: true, email: true },
  });
  if (!user) {
    console.log(JSON.stringify({ error: "USER_NOT_FOUND", email: ACTOR_EMAIL }, null, 2));
    process.exit(2);
  }

  const personalContext = await resolvePersonalContext({
    tenantId: tenant.id,
    userId: user.id,
  });

  const teamSeasonIds = getPersonallyRelevantTeamSeasonIds(personalContext);
  const f2Team = personalContext.teams.find((t) => t.teamName.includes("F2") || t.teamSeasonIds.some((id) => id));

  const monthStart = new Date("2026-09-01T00:00:00.000+02:00");
  const monthEnd = new Date("2026-09-30T23:59:59.999+02:00");
  const { dateFrom, dateTo } = resolveTrainingSessionDateBoundsForProgrammeRange({
    rangeStart: monthStart,
    rangeEnd: monthEnd,
    timeZone: TIME_ZONE,
  });

  const trainingSessions = await listTrainingSessions(tenant.id, {
    teamSeasonIds,
    dateFrom,
    dateTo,
  });

  const { platform, tenant: tenantPerms } = await getRequestEffectivePermissions(user.id, tenant.id);
  const permissionKeys = [...platform, ...tenantPerms];

  const programme = await loadPersonalProgramme({
    tenantId: tenant.id,
    userId: user.id,
    timeZone: TIME_ZONE,
    from: monthStart,
    to: monthEnd,
    permissionKeys,
  });

  const trainingProgramme = programme.items.filter((i) => i.sourceType === "TRAINING");

  function sessionsForDates(dates: string[]) {
    return trainingSessions.filter((s) => dates.includes(s.date));
  }

  console.log(
    JSON.stringify(
      {
        databaseIdentity,
        stageWrite: false,
        actor: { userId: user.id, email: user.email },
        personalTeams: personalContext.teams.map((t) => ({
          teamId: t.teamId,
          teamName: t.teamName,
          kinds: t.kinds,
          teamSeasonIds: t.teamSeasonIds,
        })),
        f2Scope: f2Team ?? null,
        trainingSessionCountSeptember: trainingSessions.length,
        trainingProgrammeCountSeptember: trainingProgramme.length,
        forensicWeeks: {
          currentWeek: sessionsForDates(FORENSIC_WEEKS.currentWeek),
          nextWeek: sessionsForDates(FORENSIC_WEEKS.nextWeek),
        },
        legacyEventTrainingSeptember: await prisma.event.count({
          where: {
            tenantId: tenant.id,
            type: "TRAINING",
            startAt: { gte: monthStart, lte: monthEnd },
          },
        }),
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

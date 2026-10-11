/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01D R2 — read-only STAGE readiness scan for Human UAT.
 *
 * Run:
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *   ./node_modules/.bin/tsx scripts/match-squad-01d-r2-uat-readiness.ts
 */

import { createHash } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import {
  buildPlayerReleasePlan,
  resolvePlayerReleasePlanningCandidates,
} from "@/lib/match-squad/player-release-planning-service";
import { resolveTargetTeamTrainerRecipientUserIds } from "@/lib/match-squad/player-release-target-trainer-recipients";

const STAGE_FP = "acd3b37682911890";
const TENANT_ID = "cmomwboak0000tsf3zzivrs46";
const TIMEZONE = "Europe/Zurich";

const B1_TEAM_ID = "cmrkh1mb1000i04jurtajh262";
const B1_TEAM_SEASON_ID = "cmsoczv2t000504juhvod5hi9";
const B2_TEAM_ID = "cmrkh1mo4000k04ju4c4302w9";
const B2_TEAM_SEASON_ID = "cmsoczvt0000604ju1f1eindm";
const A_TEAM_ID = "cmrkh1ll0000e04ju4mijytse";
const A_TEAM_SEASON_ID = "cmsoczuce000404jum730xbwu";

const PLAYER_01 = "cmv2m3gep0000eujsih4nx7e8";
const PLAYER_06 = "cmv2m4f42000gkojsn0owkuy1";

const CLUB_ADMIN_USER_ID = "cmsfzrets001bzsf3m46svf5q";

function assertStage(): void {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL missing");
  const u = new URL(url);
  const db = decodeURIComponent(u.pathname.replace(/^\//, ""));
  const fp = createHash("sha256")
    .update(`${u.hostname.toLowerCase()}:${db}`)
    .digest("hex")
    .slice(0, 16);
  if (fp !== STAGE_FP) {
    throw new Error(`Refusing: fingerprint ${fp} !== STAGE ${STAGE_FP}`);
  }
}

function formatEventLine(startAt: Date): { date: string; time: string } {
  const date = new Intl.DateTimeFormat("de-CH", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TIMEZONE,
  }).format(startAt);
  const time = new Intl.DateTimeFormat("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIMEZONE,
  }).format(startAt);
  return { date, time };
}

async function pickNearestMatch(teamId: string, teamSeasonId: string) {
  const now = new Date();
  const horizon = new Date(now.getTime() + 56 * 86400000);
  const season = await prisma.teamSeason.findFirst({
    where: { id: teamSeasonId },
    select: { seasonId: true },
  });
  if (!season) return null;

  const events = await prisma.event.findMany({
    where: {
      tenantId: TENANT_ID,
      type: "MATCH",
      startAt: { gte: now, lte: horizon },
      status: { notIn: ["CANCELLED", "POSTPONED", "COMPLETED"] },
      OR: [
        { teamSeasonId },
        { teamSeasonId: null, teamId, seasonId: season.seasonId },
      ],
    },
    select: {
      id: true,
      title: true,
      startAt: true,
      status: true,
      teamSeasonId: true,
      teamId: true,
    },
    orderBy: { startAt: "asc" },
    take: 5,
  });
  return events[0] ?? null;
}

async function main(): Promise<void> {
  assertStage();

  const candidates = await resolvePlayerReleasePlanningCandidates({
    tenantId: TENANT_ID,
    sourceTeamSeasonId: B1_TEAM_SEASON_ID,
    personIds: [PLAYER_01, PLAYER_06],
    timezone: TIMEZONE,
  });

  const b2Match = await pickNearestMatch(B2_TEAM_ID, B2_TEAM_SEASON_ID);
  const aMatch = await pickNearestMatch(A_TEAM_ID, A_TEAM_SEASON_ID);

  if (!b2Match || !aMatch) {
    throw new Error("Missing B2 or Junioren A upcoming match on STAGE");
  }

  const review = await buildPlayerReleasePlan({
    tenantId: TENANT_ID,
    teamId: B1_TEAM_ID,
    sourceTeamSeasonId: B1_TEAM_SEASON_ID,
    personIds: [PLAYER_01, PLAYER_06],
    eventIds: [b2Match.id, aMatch.id],
    timezone: TIMEZONE,
    activityDefaults: {
      [b2Match.id]: { maxMinutes: 30, reason: "KADERAUSGLEICH" },
      [aMatch.id]: { maxMinutes: null, reason: "SPIELPRAXIS" },
    },
  });

  const b2Recipients = await resolveTargetTeamTrainerRecipientUserIds({
    tenantId: TENANT_ID,
    targetTeamSeasonId: B2_TEAM_SEASON_ID,
    excludeUserIds: [CLUB_ADMIN_USER_ID],
  });
  const aRecipients = await resolveTargetTeamTrainerRecipientUserIds({
    tenantId: TENANT_ID,
    targetTeamSeasonId: A_TEAM_SEASON_ID,
    excludeUserIds: [CLUB_ADMIN_USER_ID],
  });

  const b2Line = formatEventLine(b2Match.startAt);
  const aLine = formatEventLine(aMatch.startAt);

  console.log(
    JSON.stringify(
      {
        SOURCE_TEAM: "FC Allschwil Junioren B1",
        SOURCE_TEAM_ID: B1_TEAM_ID,
        SOURCE_TEAMSEASON_ID: B1_TEAM_SEASON_ID,
        SOURCE_TRAINER_USER: CLUB_ADMIN_USER_ID,
        PLAYERS: ["SCE Testspieler 01", "SCE Testspieler 06"],
        B2_ACTIVITY: {
          TEAM: "FC Allschwil Junioren B2",
          TEAM_ID: B2_TEAM_ID,
          TEAMSEASON_ID: B2_TEAM_SEASON_ID,
          ACTIVITY_ID: b2Match.id,
          TYPE: "MATCH",
          DATE: b2Line.date,
          TIME: b2Line.time,
          TITLE: b2Match.title,
          ROUTE: `/dashboard/matchcenter/${b2Match.id}`,
        },
        A_ACTIVITY: {
          TEAM: "FC Allschwil Junioren A",
          NOTE: "STAGE has no literal Junioren A2 team — Junioren A is the R2 second-target stand-in.",
          TEAM_ID: A_TEAM_ID,
          TEAMSEASON_ID: A_TEAM_SEASON_ID,
          ACTIVITY_ID: aMatch.id,
          TYPE: "MATCH",
          DATE: aLine.date,
          TIME: aLine.time,
          TITLE: aMatch.title,
          ROUTE: `/dashboard/matchcenter/${aMatch.id}`,
        },
        PLAN_REVIEW: {
          playerCount: review.playerCount,
          activityCount: review.activityCount,
          validReleaseCount: review.validReleaseCount,
          invalidCombinationCount: review.invalidCombinationCount,
        },
        CANDIDATE_ACTIVITIES_TOTAL: candidates.activitiesByDate.reduce(
          (n, g) => n + g.activities.length,
          0,
        ),
        B2_NOTIFICATION_RECIPIENTS: b2Recipients,
        A_NOTIFICATION_RECIPIENTS: aRecipients,
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

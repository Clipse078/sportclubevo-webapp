/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01D R2.1 — STAGE readiness for uniform Match/Kader planner UAT.
 *
 * Run:
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *   ./node_modules/.bin/tsx scripts/match-squad-01d-r2-1-uat-readiness.ts
 */

import { createHash } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { resolvePlayerReleasePlanningCandidates } from "@/lib/match-squad/player-release-planning-service";

const STAGE_FP = "acd3b37682911890";
const TENANT_ID = "cmomwboak0000tsf3zzivrs46";
const TIMEZONE = "Europe/Zurich";

const B1_TEAM_ID = "cmrkh1mb1000i04jurtajh262";
const B1_TEAM_SEASON_ID = "cmsoczv2t000504juhvod5hi9";
const B2_TEAM_SEASON_ID = "cmsoczvt0000604ju1f1eindm";
const A_TEAM_SEASON_ID = "cmsoczuce000404jum730xbwu";

const PLAYER_01 = "cmv2m3gep0000eujsih4nx7e8";

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

async function pickSourceB1Match() {
  const now = new Date();
  const horizon = new Date(now.getTime() + 56 * 86400000);
  const season = await prisma.teamSeason.findFirst({
    where: { id: B1_TEAM_SEASON_ID },
    select: { seasonId: true },
  });
  if (!season) return null;

  return prisma.event.findFirst({
    where: {
      tenantId: TENANT_ID,
      type: "MATCH",
      startAt: { gte: now, lte: horizon },
      status: { notIn: ["CANCELLED", "POSTPONED", "COMPLETED"] },
      OR: [
        { teamSeasonId: B1_TEAM_SEASON_ID },
        { teamSeasonId: null, teamId: B1_TEAM_ID, seasonId: season.seasonId },
      ],
    },
    orderBy: { startAt: "asc" },
    select: { id: true, title: true, startAt: true },
  });
}

async function main(): Promise<void> {
  assertStage();

  const sourceMatch = await pickSourceB1Match();
  if (!sourceMatch) {
    throw new Error("No upcoming B1 source match found on STAGE");
  }

  const kaderCandidates = await resolvePlayerReleasePlanningCandidates({
    tenantId: TENANT_ID,
    sourceTeamSeasonId: B1_TEAM_SEASON_ID,
    personIds: [PLAYER_01],
    timezone: TIMEZONE,
  });

  const matchCandidates = await resolvePlayerReleasePlanningCandidates({
    tenantId: TENANT_ID,
    sourceTeamSeasonId: B1_TEAM_SEASON_ID,
    personIds: [PLAYER_01],
    timezone: TIMEZONE,
    sourceEventId: sourceMatch.id,
  });

  const b2Team = matchCandidates.targetTeams.find((row) => row.targetTeamSeasonId === B2_TEAM_SEASON_ID);
  const aTeam = matchCandidates.targetTeams.find((row) => row.targetTeamSeasonId === A_TEAM_SEASON_ID);

  console.log(
    JSON.stringify(
      {
        R2_1_UAT: {
          sourceMatch: {
            id: sourceMatch.id,
            title: sourceMatch.title,
            startAt: sourceMatch.startAt.toISOString(),
            route: `/dashboard/spiele/${sourceMatch.id}/edit`,
          },
          sourcePlayer: PLAYER_01,
          matchEntry: {
            action: "Aufgebot → Freigeben → PlayerReleasePlanningSheet",
            expectedPlanner: "Spielerfreigaben planen (not Spieler freigeben modal)",
            sourceEventContext: matchCandidates.sourceEventContext,
          },
          kaderEntry: {
            planningMode: kaderCandidates.planningMode,
            targetTeamCount: kaderCandidates.targetTeams.length,
          },
          matchEntryPlanning: {
            planningMode: matchCandidates.planningMode,
            targetTeamCount: matchCandidates.targetTeams.length,
            b2ActivityCount: b2Team?.activityCount ?? 0,
            aActivityCount: aTeam?.activityCount ?? 0,
          },
          multiPlayerMatchAufgebot: {
            implemented: false,
            reason:
              "Match Aufgebot has no multi-select release bar; planner API accepts multiple personIds when UX adds selection.",
          },
        },
      },
      null,
      2,
    ),
  );
}

void main();

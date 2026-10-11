/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01D R2 — bounded STAGE Human UAT fixture.
 *
 * - Ensures Junioren A (A2 UAT stand-in) has a trainer user distinct from B1 source + B2 Patrick.
 * - Revokes controlled SCE Testspieler 01/06 activity releases for selected B2 + A matches.
 *
 * Run:
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *   ./node_modules/.bin/tsx scripts/match-squad-01d-r2-uat-stage-fixture.ts
 */

import { createHash } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { addTrainerToTeamSeason } from "@/lib/teams/roster-membership-service";
import { revokePlayerRelease } from "@/lib/match-squad/player-release-service";

const STAGE_FP = "acd3b37682911890";
const TENANT_ID = "cmomwboak0000tsf3zzivrs46";
const B1_TEAM_ID = "cmrkh1mb1000i04jurtajh262";
const B1_TEAM_SEASON_ID = "cmsoczv2t000504juhvod5hi9";
const A_TEAM_ID = "cmrkh1ll0000e04ju4mijytse";
const A_TEAM_SEASON_ID = "cmsoczuce000404jum730xbwu";

const CLUB_ADMIN_USER_ID = "cmsfzrets001bzsf3m46svf5q";

/** Spielbetrieb — STAGE trainer account for Junioren A R2 awareness UAT (distinct from B2 Patrick). */
const A_TARGET_TRAINER_PERSON_ID = "cmuo26ofc000004l6l5ousho7";

const UAT_PLAYER_IDS = [
  "cmv2m3gep0000eujsih4nx7e8", // SCE Testspieler 01
  "cmv2m4f42000gkojsn0owkuy1", // SCE Testspieler 06
];

/** Primary R2 Human UAT activities (see readiness script output). */
const UAT_EVENT_IDS = [
  "cmrzhj6qc006w04kwxd2d01lj", // B2 match (primary R2 Activity A)
  "cmuk7th5s004z04kxj153wp33", // Junioren A match (primary R2 Activity B)
  "cmuk7trj5005k04kxv1tqqmxy", // alternate Junioren A match — cleanup only
];

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
  if (process.env.SCE_DATA_ENVIRONMENT?.toUpperCase() !== "STAGE") {
    throw new Error("Set SCE_DATA_ENVIRONMENT=STAGE");
  }
}

async function main(): Promise<void> {
  assertStage();

  const aTrainer = await prisma.person.findFirst({
    where: { id: A_TARGET_TRAINER_PERSON_ID, tenantId: TENANT_ID },
    select: { id: true, isTrainer: true, userId: true },
  });
  if (!aTrainer?.userId) {
    throw new Error("Junioren A UAT trainer person must have linked User");
  }
  if (!aTrainer.isTrainer) {
    await prisma.person.update({
      where: { id: aTrainer.id },
      data: { isTrainer: true },
    });
    console.log("[R2 fixture] Set isTrainer=true for Junioren A UAT trainer (Spielbetrieb)");
  }

  const trainerResult = await addTrainerToTeamSeason({
    tenantId: TENANT_ID,
    teamId: A_TEAM_ID,
    teamSeasonId: A_TEAM_SEASON_ID,
    personId: A_TARGET_TRAINER_PERSON_ID,
  });
  if (!trainerResult.ok) {
    throw new Error(
      `Junioren A trainer membership failed: ${trainerResult.code} ${trainerResult.message}`,
    );
  }
  console.log(`[R2 fixture] TrainerTeamMember Junioren A: ${trainerResult.outcome}`);

  const activeReleases = await prisma.playerRelease.findMany({
    where: {
      tenantId: TENANT_ID,
      sourceTeamSeasonId: B1_TEAM_SEASON_ID,
      personId: { in: UAT_PLAYER_IDS },
      status: "ACTIVE",
      scope: "ACTIVITY",
      eventId: { in: UAT_EVENT_IDS },
    },
    select: { id: true, personId: true, eventId: true },
  });

  for (const row of activeReleases) {
    await revokePlayerRelease({
      tenantId: TENANT_ID,
      teamId: B1_TEAM_ID,
      sourceTeamSeasonId: B1_TEAM_SEASON_ID,
      releaseId: row.id,
      actorUserId: CLUB_ADMIN_USER_ID,
    });
    console.log(`[R2 fixture] Revoked release ${row.id} (${row.personId} → ${row.eventId})`);
  }

  const openRequests = await prisma.playerReleaseRequest.findMany({
    where: {
      tenantId: TENANT_ID,
      sourceTeamSeasonId: B1_TEAM_SEASON_ID,
      personId: { in: UAT_PLAYER_IDS },
      targetEventId: { in: UAT_EVENT_IDS },
      status: { in: ["PENDING", "APPROVED"] },
    },
    select: { id: true, status: true },
  });
  if (openRequests.length > 0) {
    console.warn(
      "[R2 fixture] Open UAT requests remain (manual PO cleanup if needed):",
      openRequests,
    );
  }

  const remaining = await prisma.playerRelease.count({
    where: {
      tenantId: TENANT_ID,
      sourceTeamSeasonId: B1_TEAM_SEASON_ID,
      personId: { in: UAT_PLAYER_IDS },
      status: "ACTIVE",
      scope: "ACTIVITY",
      eventId: { in: UAT_EVENT_IDS },
    },
  });
  console.log("[R2 fixture] Remaining active UAT activity releases:", remaining);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

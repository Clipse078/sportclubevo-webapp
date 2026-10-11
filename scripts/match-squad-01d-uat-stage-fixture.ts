/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01D — bounded STAGE UAT fixture (trainer recipients + clean slate).
 *
 * Run:
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *   ./node_modules/.bin/tsx scripts/match-squad-01d-uat-stage-fixture.ts
 *
 * Mutates ONLY:
 *   - TrainerTeamMember on B1/B2 for controlled UAT actors
 *   - Person.isTrainer for Patrick Scotton (B2 target trainer; required by roster service)
 *   - Revokes prior 01C UAT PlayerRelease rows for SCE Testspieler 01/02 → B2
 */

import { createHash } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { addTrainerToTeamSeason } from "@/lib/teams/roster-membership-service";
import { revokePlayerRelease } from "@/lib/match-squad/player-release-service";

const STAGE_FP = "acd3b37682911890";
const TENANT_ID = "cmomwboak0000tsf3zzivrs46";
const B1_TEAM_ID = "cmrkh1mb1000i04jurtajh262";
const B1_TEAM_SEASON_ID = "cmsoczv2t000504juhvod5hi9";
const B2_TEAM_ID = "cmrkh1mo4000k04ju4c4302w9";
const B2_TEAM_SEASON_ID = "cmsoczvt0000604ju1f1eindm";

const CLUB_ADMIN_USER_ID = "cmsfzrets001bzsf3m46svf5q";
const CLUB_ADMIN_PERSON_ID = "cmsnqz0qz000004l8g2efoyhw";
const TARGET_TRAINER_A_PERSON_ID = "cmuo3i77h000g04ibl09t7t2p"; // Patrick Scotton

const LEGACY_RELEASE_IDS = [
  "cmv2vqa3e000006l845zu5kkx",
  "cmv2wc7nt000006jvk1sb3443",
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

  const patrick = await prisma.person.findFirst({
    where: { id: TARGET_TRAINER_A_PERSON_ID, tenantId: TENANT_ID },
    select: { id: true, isTrainer: true },
  });
  if (!patrick) throw new Error("Target trainer person missing");
  if (!patrick.isTrainer) {
    await prisma.person.update({
      where: { id: patrick.id },
      data: { isTrainer: true },
    });
    console.log("[fixture] Set isTrainer=true for Patrick Scotton (B2 UAT target trainer)");
  }

  for (const row of [
    { teamSeasonId: B1_TEAM_SEASON_ID, personId: CLUB_ADMIN_PERSON_ID, label: "B1 source" },
    { teamSeasonId: B2_TEAM_SEASON_ID, personId: TARGET_TRAINER_A_PERSON_ID, label: "B2 target" },
  ]) {
    const result = await addTrainerToTeamSeason({
      tenantId: TENANT_ID,
      teamId: row.teamSeasonId === B1_TEAM_SEASON_ID ? B1_TEAM_ID : B2_TEAM_ID,
      teamSeasonId: row.teamSeasonId,
      personId: row.personId,
    });
    if (!result.ok) {
      throw new Error(`${row.label} trainer membership failed: ${result.code} ${result.message}`);
    }
    console.log(`[fixture] TrainerTeamMember ${row.label}: ${result.outcome}`);
  }

  for (const releaseId of LEGACY_RELEASE_IDS) {
    try {
      await revokePlayerRelease({
        tenantId: TENANT_ID,
        teamId: B1_TEAM_ID,
        sourceTeamSeasonId: B1_TEAM_SEASON_ID,
        releaseId,
        actorUserId: CLUB_ADMIN_USER_ID,
      });
      console.log(`[fixture] Revoked legacy release ${releaseId}`);
    } catch (error) {
      console.warn(`[fixture] Skip revoke ${releaseId}:`, error instanceof Error ? error.message : error);
    }
  }

  const remaining = await prisma.playerRelease.count({
    where: {
      sourceTeamSeasonId: B1_TEAM_SEASON_ID,
      targetTeamSeasonId: B2_TEAM_SEASON_ID,
      status: "ACTIVE",
      personId: {
        in: [
          "cmv2m3gep0000eujsih4nx7e8",
          "cmv2m4cta000akojs54x9wcpy",
          "cmv2m4f42000gkojsn0owkuy1",
        ],
      },
    },
  });
  console.log("[fixture] Active B1→B2 releases for UAT players:", remaining);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

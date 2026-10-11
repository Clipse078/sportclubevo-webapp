/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01E — bounded STAGE UAT fixture (read/write).
 *
 * Ensures B2 match cmrzhj6qc006w04kwxd2d01lj has APPROVED request for SCE Testspieler 01, not yet assigned.
 *
 * Usage: npx tsx scripts/match-squad-01e-uat-stage-fixture.ts
 */

import { prisma } from "@/lib/db/prisma";

const TENANT_ID = "cmomwboak0000tsf3zzivrs46";
const B1_TS = "cmsoczv2t000504juhvod5hi9";
const B2_TS = "cmsoczvt0000604ju1f1eindm";
const B2_MATCH = "cmrzhj6qc006w04kwxd2d01lj";
const TESTSPIELER_01 = "cmv2m3gep0000eujsih4nx7e8";

async function main() {
  const release = await prisma.playerRelease.findFirst({
    where: {
      tenantId: TENANT_ID,
      personId: TESTSPIELER_01,
      sourceTeamSeasonId: B1_TS,
      targetTeamSeasonId: B2_TS,
      eventId: B2_MATCH,
      status: "ACTIVE",
    },
    orderBy: { createdAt: "desc" },
  });

  if (!release) {
    console.error("No active PlayerRelease for Testspieler 01 → B2 match. Create via 01C/01D UAT first.");
    process.exit(1);
  }

  let request = await prisma.playerReleaseRequest.findFirst({
    where: {
      tenantId: TENANT_ID,
      playerReleaseId: release.id,
      targetEventId: B2_MATCH,
      status: "APPROVED",
    },
  });

  if (!request) {
    const pending = await prisma.playerReleaseRequest.findFirst({
      where: {
        tenantId: TENANT_ID,
        playerReleaseId: release.id,
        targetEventId: B2_MATCH,
        status: "PENDING",
      },
    });
    if (pending) {
      console.error("Request exists but is PENDING — approve via B1 Kader UI before 01E UAT.");
      process.exit(1);
    }
    console.error("No APPROVED PlayerReleaseRequest — complete 01D approval first.");
    process.exit(1);
  }

  const squad = await prisma.matchSquad.findUnique({
    where: { tenantId_eventId: { tenantId: TENANT_ID, eventId: B2_MATCH } },
    select: { id: true },
  });

  if (squad) {
    const assigned = await prisma.matchSquadMember.findFirst({
      where: {
        matchSquadId: squad.id,
        personId: TESTSPIELER_01,
        playerReleaseRequestId: request.id,
      },
    });
    if (assigned) {
      await prisma.matchSquadMember.delete({ where: { id: assigned.id } });
      console.log("Removed existing assignment row for clean 01E UAT start.");
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        releaseId: release.id,
        requestId: request.id,
        targetMatch: B2_MATCH,
        route: `/dashboard/matchcenter/${B2_MATCH}?tab=aufgebot`,
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

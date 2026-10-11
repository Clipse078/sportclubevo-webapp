/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01F — read-only Club UAT readiness scan (STAGE fixtures).
 *
 * Usage: npx tsx scripts/match-squad-01f-club-uat-readiness.ts
 */

import { prisma } from "@/lib/db/prisma";
import {
  MATCH_SQUAD_B1_TEAM_SEASON_ID,
  MATCH_SQUAD_CONTROLLED_PERSON_IDS,
  MATCH_SQUAD_CONTROLLED_TENANT_ID,
} from "@/lib/match-squad/match-squad-controlled-test-data-ledger";

const B2_TEAM_SEASON_ID = "cmsoczvt0000604ju1f1eindm";
const B2_MATCH = "cmrzhj6qc006w04kwxd2d01lj";
const B1_AVAILABILITY_MATCH = "cmrzhj3je006a04kwhbepxvdz";

async function main() {
  const persons = await prisma.person.count({
    where: {
      tenantId: MATCH_SQUAD_CONTROLLED_TENANT_ID,
      id: { in: [...MATCH_SQUAD_CONTROLLED_PERSON_IDS] },
    },
  });

  const b1Roster = await prisma.playerSquadMember.count({
    where: {
      teamSeasonId: MATCH_SQUAD_B1_TEAM_SEASON_ID,
      personId: { in: [...MATCH_SQUAD_CONTROLLED_PERSON_IDS] },
    },
  });

  const b2Match = await prisma.event.findFirst({
    where: { id: B2_MATCH, tenantId: MATCH_SQUAD_CONTROLLED_TENANT_ID },
    select: { id: true, title: true, startAt: true, status: true },
  });

  const releases = await prisma.playerRelease.count({
    where: {
      tenantId: MATCH_SQUAD_CONTROLLED_TENANT_ID,
      sourceTeamSeasonId: MATCH_SQUAD_B1_TEAM_SEASON_ID,
      targetTeamSeasonId: B2_TEAM_SEASON_ID,
      personId: { in: [...MATCH_SQUAD_CONTROLLED_PERSON_IDS] },
      status: "ACTIVE",
    },
  });

  console.log(
    JSON.stringify(
      {
        package: "MATCH_SQUAD_PLAYER_AVAILABILITY-01F",
        tenantId: MATCH_SQUAD_CONTROLLED_TENANT_ID,
        controlledPersonsPresent: persons,
        expectedPersons: MATCH_SQUAD_CONTROLLED_PERSON_IDS.length,
        b1RosterMemberships: b1Roster,
        b1AvailabilityMatchId: B1_AVAILABILITY_MATCH,
        b2TargetMatch: b2Match,
        activeB1ToB2Releases: releases,
        uatReady:
          persons === MATCH_SQUAD_CONTROLLED_PERSON_IDS.length &&
          b1Roster >= 6 &&
          Boolean(b2Match),
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

/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01A — idempotent UAT test data via domain services.
 * Run: ./node_modules/.bin/tsx scripts/match-squad-01a-uat-seed-test-data.ts
 */

import { prisma } from "@/lib/db/prisma";
import { addPlayerToTeamSeason } from "@/lib/teams/roster-membership-service";
import { respondToParticipation } from "@/lib/participation/participation-service";

const TENANT_ID = "cmomwboak0000tsf3zzivrs46";
const TEAM_ID = "cmrkh1mb1000i04jurtajh262";
const TEAM_SEASON_ID = "cmsoczv2t000504juhvod5hi9";
const POPULATED_MATCH_EVENT_ID = "cmrzhj3je006a04kwhbepxvdz";

const PLAYERS: Array<{
  displayName: string;
  firstName: string;
  lastName: string;
  status: "ACTIVE" | "INJURED" | "ABSENT";
  shirtNumber: number;
  participation?: "YES" | "NO" | "OPEN" | "MAYBE";
}> = [
  { displayName: "SCE Testspieler 01", firstName: "SCE", lastName: "Testspieler 01", status: "ACTIVE", shirtNumber: 901, participation: "OPEN" },
  { displayName: "SCE Testspieler 02", firstName: "SCE", lastName: "Testspieler 02", status: "ACTIVE", shirtNumber: 902, participation: "YES" },
  { displayName: "SCE Testspieler 03", firstName: "SCE", lastName: "Testspieler 03", status: "ACTIVE", shirtNumber: 903, participation: "NO" },
  { displayName: "SCE Testspieler 04", firstName: "SCE", lastName: "Testspieler 04", status: "INJURED", shirtNumber: 904, participation: "MAYBE" },
  { displayName: "SCE Testspieler 05", firstName: "SCE", lastName: "Testspieler 05", status: "ABSENT", shirtNumber: 905 },
  { displayName: "SCE Testspieler 06", firstName: "SCE", lastName: "Testspieler 06", status: "ACTIVE", shirtNumber: 906, participation: "YES" },
];

async function ensurePerson(input: (typeof PLAYERS)[number]) {
  const existing = await prisma.person.findFirst({
    where: {
      tenantId: TENANT_ID,
      displayName: input.displayName,
    },
    select: { id: true },
  });
  if (existing) {
    return existing.id;
  }

  const created = await prisma.person.create({
    data: {
      tenantId: TENANT_ID,
      firstName: input.firstName,
      lastName: input.lastName,
      displayName: input.displayName,
      isPlayer: true,
      dateOfBirth: new Date("2010-06-01"),
    },
    select: { id: true },
  });
  return created.id;
}

async function main() {
  const createdRecords: Array<{ type: string; id: string; displayName: string }> = [];

  for (const player of PLAYERS) {
    const personId = await ensurePerson(player);
    const existingMember = await prisma.playerSquadMember.findFirst({
      where: { teamSeasonId: TEAM_SEASON_ID, personId },
      select: { id: true, status: true },
    });

    if (!existingMember) {
      const result = await addPlayerToTeamSeason({
        tenantId: TENANT_ID,
        teamId: TEAM_ID,
        teamSeasonId: TEAM_SEASON_ID,
        personId,
        status: player.status,
        shirtNumber: player.shirtNumber,
        sortOrder: player.shirtNumber,
        isWebsiteVisible: false,
        remarks: "MATCH_SQUAD_PLAYER_AVAILABILITY-01A UAT",
      });
      if (!result.ok) {
        throw new Error(`${player.displayName}: ${result.message}`);
      }
      createdRecords.push({
        type: "PlayerSquadMember",
        id: result.squadMember.id,
        displayName: player.displayName,
      });
    }

    if (player.participation) {
      await respondToParticipation(TENANT_ID, null, {
        teamSeasonId: TEAM_SEASON_ID,
        personId,
        status: player.participation,
        note: null,
        responseSource: "STAFF",
        event: { eventKind: "MATCH", eventId: POPULATED_MATCH_EVENT_ID },
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        populatedMatchEventId: POPULATED_MATCH_EVENT_ID,
        teamSeasonId: TEAM_SEASON_ID,
        createdRecords,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

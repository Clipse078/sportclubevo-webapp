/**
 * Read-only STAGE snapshot of 01F operational tracks for B1 Spielerfreigaben.
 */
import { prisma } from "@/lib/db/prisma";
import { loadCrossTeamOperationalTracksForSourceTeamSeason } from "@/lib/match-squad/cross-team-player-operational-state-service";
import {
  MATCH_SQUAD_B1_TEAM_SEASON_ID,
  MATCH_SQUAD_CONTROLLED_TENANT_ID,
} from "@/lib/match-squad/match-squad-controlled-test-data-ledger";

async function main() {
  const releases = await prisma.playerRelease.findMany({
    where: {
      tenantId: MATCH_SQUAD_CONTROLLED_TENANT_ID,
      sourceTeamSeasonId: MATCH_SQUAD_B1_TEAM_SEASON_ID,
      status: "ACTIVE",
    },
    select: { id: true, person: { select: { displayName: true } } },
  });

  const tracks = await loadCrossTeamOperationalTracksForSourceTeamSeason({
    tenantId: MATCH_SQUAD_CONTROLLED_TENANT_ID,
    sourceTeamSeasonId: MATCH_SQUAD_B1_TEAM_SEASON_ID,
    releaseIds: releases.map((r) => r.id),
    timezone: "Europe/Zurich",
  });

  console.log(
    JSON.stringify(
      {
        activeReleaseCount: releases.length,
        releases: releases.map((r) => ({
          id: r.id,
          person: r.person.displayName,
          tracks: tracks[r.id] ?? [],
        })),
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
  .finally(async () => {
    await prisma.$disconnect();
  });

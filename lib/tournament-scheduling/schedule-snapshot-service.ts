/**
 * SCE-TOURNAMENT-PLANNER-01B — load schedule version snapshot (fixtures + assignments).
 */

import type { TournamentScheduleSnapshot } from "./types";
import { listTournamentFixtures } from "./fixture-service";
import { getTournamentScheduleVersion } from "./schedule-version-service";
import { listTournamentFixtureAssignmentsForVersion } from "./assignment-service";

export async function loadTournamentScheduleSnapshot(
  tenantId: string,
  scheduleVersionId: string,
): Promise<TournamentScheduleSnapshot> {
  const version = await getTournamentScheduleVersion(tenantId, scheduleVersionId);
  const [fixtures, assignments] = await Promise.all([
    listTournamentFixtures(tenantId, version.eventId),
    listTournamentFixtureAssignmentsForVersion(tenantId, scheduleVersionId),
  ]);

  return { version, fixtures, assignments };
}

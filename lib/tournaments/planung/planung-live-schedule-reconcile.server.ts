/**
 * R7.3 — persist operational settings, then reconcile WHEN/WHERE via partial regeneration.
 */

import { prisma } from "@/lib/db/prisma";
import { runTournamentScheduleRegeneration } from "@/lib/tournament-scheduling/tournament-schedule-orchestration-service";
import { loadTournamentPlanungViewModel } from "./load-tournament-planung.server";
import type { TournamentPlanungViewModel } from "./types";
import type { PlanungScheduleConsistencyStatus } from "./assess-planung-schedule-consistency";
import { regeneratePlanungFixtureTopologyForHomeAway } from "./planung-fixture-topology-regeneration.server";
import { TournamentSchedulingError } from "@/lib/tournament-scheduling/errors";

export type PlanungLiveScheduleReconcileResult = {
  viewModel: TournamentPlanungViewModel;
  scheduleConsistencyOverride: PlanungScheduleConsistencyStatus | undefined;
  regenerationAttempted: boolean;
  regenerationSucceeded: boolean;
  finalRevision: number | null;
};

export async function applyPlanungLiveScheduleReconcile(params: {
  tenantId: string;
  tournamentId: string;
  scheduleVersionId: string;
  expectedRevision?: number;
  homeAwayChanged?: boolean;
  fixtureHomeAwayRelevance?: "ON" | "OFF";
  timezone: string;
  tenantName: string | null;
  tenantLogoUrl: string | null;
}): Promise<PlanungLiveScheduleReconcileResult> {
  let revision = params.expectedRevision ?? null;

  let topologyRegenerated = false;
  if (params.homeAwayChanged && params.fixtureHomeAwayRelevance) {
    await regeneratePlanungFixtureTopologyForHomeAway({
      tenantId: params.tenantId,
      tournamentId: params.tournamentId,
      fixtureHomeAwayRelevance: params.fixtureHomeAwayRelevance,
    });
    topologyRegenerated = true;
  }

  const fixtureCount = await prisma.tournamentFixture.count({
    where: { tenantId: params.tenantId, eventId: params.tournamentId },
  });

  let regenerationAttempted = false;
  let regenerationSucceeded = false;
  let scheduleConsistencyOverride: PlanungScheduleConsistencyStatus | undefined;

  if (fixtureCount > 0 || topologyRegenerated) {
    regenerationAttempted = true;
    try {
      const regen = await runTournamentScheduleRegeneration({
        tenantId: params.tenantId,
        tournamentId: params.tournamentId,
        scheduleVersionId: params.scheduleVersionId,
        expectedRevision: revision ?? undefined,
        topologyReconciled: topologyRegenerated,
      });

      revision = regen.revision;

      const regenAssignmentCount = regen.regeneration.assignments.length;
      const completeForTopology =
        !topologyRegenerated || regenAssignmentCount === fixtureCount;

      if (regen.regeneration.lockConflictDiagnostics.length > 0) {
        scheduleConsistencyOverride = "NEEDS_REGENERATION";
      } else if (
        regen.regeneration.status === "INFEASIBLE_PROVEN" ||
        regenAssignmentCount === 0 ||
        !completeForTopology
      ) {
        scheduleConsistencyOverride = "NEEDS_REGENERATION";
      } else {
        regenerationSucceeded = true;
      }
    } catch (err) {
      if (err instanceof TournamentSchedulingError && err.code === "SCHEDULE.STALE_VERSION") {
        throw err;
      }
      scheduleConsistencyOverride = "NEEDS_REGENERATION";
    }
  }

  const viewModel = await loadTournamentPlanungViewModel({
    tenantId: params.tenantId,
    tournamentId: params.tournamentId,
    timezone: params.timezone,
    tenantName: params.tenantName,
    tenantLogoUrl: params.tenantLogoUrl,
    scheduleConsistencyOverride,
  });

  return {
    viewModel,
    scheduleConsistencyOverride,
    regenerationAttempted,
    regenerationSucceeded,
    finalRevision: viewModel.scheduleRevision,
  };
}
